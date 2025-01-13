import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Extract the tracking number from this shipping label.
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
    const trackingInfo = await extractTrackingNumber(buffer);

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
