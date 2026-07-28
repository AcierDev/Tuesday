import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Number of times to run the AI analysis before giving up. The model
// occasionally misreads or returns an invalid tracking number on the first
// pass, so we retry once.
const MAX_EXTRACTION_ATTEMPTS = 2;

const TRACKING_FORMATS: Record<string, RegExp> = {
  UPS: /^1Z[A-Z0-9]{16}$/,
  FedEx: /^(\d{12}|\d{14,15})$/,
  USPS: /^(\d{20}|\d{26}|\d{30}|9\d{15,21})$/,
  DHL: /^[0-9]{10,12}$/,
};

function isValidTrackingInfo(info: unknown): boolean {
  if (!info || typeof info !== "object") return false;
  const { trackingNumber, carrier } = info as {
    trackingNumber?: string;
    carrier?: string;
  };
  if (!trackingNumber || !carrier) return false;
  const cleaned = String(trackingNumber).replace(/\s+/g, "");
  return TRACKING_FORMATS[carrier]?.test(cleaned) ?? false;
}

async function pdfToGenerativePart(pdfBuffer: Buffer) {
  return {
    inlineData: {
      data: pdfBuffer.toString("base64"),
      mimeType: "application/pdf",
    },
  };
}

async function extractTrackingNumber(pdfBuffer: Buffer) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `Extract the main tracking number from this shipping label. Ignore the final delivery tracking number.
    Return ONLY a raw JSON object (no markdown, no code blocks) with these fields:
    {
      "trackingNumber": "<number with no spaces>",
      "carrier": "<FedEx|UPS|USPS|DHL>",
      "sender": "<sender name or null>",
      "receiver": "<receiver name or null>"
    }
    
    Common tracking number formats:
    - FedEx: #### #### #### (12 digits)
    - UPS: 1Z#### #### #### #### (18 characters)
    - USPS: #### #### #### #### #### ## (22 digits)`;

    const imagePart = await pdfToGenerativePart(pdfBuffer);
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text().trim();

    // Remove any markdown code block syntax if present
    text = text.replace(/```json\s*|\s*```/g, "");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error extracting tracking info:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("label") as File;

    if (!pdfFile) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await pdfFile.arrayBuffer());

    // Run the AI analysis up to MAX_EXTRACTION_ATTEMPTS times, stopping early
    // once we get a valid tracking number. Keeps the most recent non-null read
    // so the client still gets a result (and can fall back to manual entry)
    // even if every attempt is invalid.
    let trackingInfo: unknown = null;
    for (let attempt = 1; attempt <= MAX_EXTRACTION_ATTEMPTS; attempt++) {
      const result = await extractTrackingNumber(buffer);
      if (result) trackingInfo = result;
      if (isValidTrackingInfo(result)) break;
      if (attempt < MAX_EXTRACTION_ATTEMPTS) {
        console.warn(
          `Tracking extraction attempt ${attempt} failed — retrying`
        );
      }
    }

    if (!trackingInfo) {
      return NextResponse.json(
        { error: "Failed to extract tracking information" },
        { status: 500 }
      );
    }

    return NextResponse.json(trackingInfo);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
