import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";

import type { TrackingInfo } from "@/types/shipping";

/**
 * Reads the tracking number straight from a label PDF's own text, so a label
 * scan needs no AI call (and keeps working when AI credits run out). FedEx and
 * UPS labels carry real text; image-only labels return null and go to the AI.
 */

const PDF_STRING_ESCAPES: Record<string, string> = {
  n: "\n", r: "\r", t: "\t", b: "\b", f: "\f",
};
const OCTAL_ESCAPE = /^[0-7]{1,3}/;
const OCTAL_RADIX = 8;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_BYTE = 2;
const BYTES_PER_UTF16_UNIT = 2;
const OPERATOR_PATTERN = /^(?:Tj|TJ|Td|TD|Tm|T\*|ET|BT|'|")(?![A-Za-z])/;
const SEPARATING_OPERATORS = new Set(["Td", "TD", "Tm", "T*", "ET", "BT", "Tj", "TJ", "'", "\""]);

// FedEx prints the tracking number last in the barcode's text line:
// "9632 0019 6 (000 000 0000) 0 00 8736 3816 8463".
const FEDEX_BARCODE_LINE = /\(\d{3} \d{3} \d{4}\)\s*\d\s*\d{2}\s*(\d{4} \d{4} \d{4})(?!\d)/g;
const FEDEX_TRK_LINE = /TRK#\s*(\d{4} \d{4} \d{4})(?!\d)/g;
// Express labels have no barcode text line; the number follows the routing code:
// "58KJ7/80FA/484B 8799 4286 4102".
const FEDEX_ROUTING_LINE = /[A-Z0-9]{5}\/[A-Z0-9]{4}\/[A-Z0-9]{4}\s*(\d{4} \d{4} \d{4})(?!\d)/g;
const UPS_TRACKING = /1Z(?:\s?[A-Z0-9]){16}/g;

function decodeHexString(hex: string): string {
  const digits = hex.replace(/\s+/g, "");
  const padded = digits.length % HEX_DIGITS_PER_BYTE ? `${digits}0` : digits;
  const bytes: number[] = [];
  for (let index = 0; index < padded.length; index += HEX_DIGITS_PER_BYTE) {
    bytes.push(parseInt(padded.slice(index, index + HEX_DIGITS_PER_BYTE), HEX_RADIX));
  }
  // Two-byte fonts (Identity-H) store each character as 00 XX.
  const twoByte =
    bytes.length >= BYTES_PER_UTF16_UNIT &&
    bytes.length % BYTES_PER_UTF16_UNIT === 0 &&
    bytes.every((value, index) => index % BYTES_PER_UTF16_UNIT !== 0 || value === 0);
  if (!twoByte) return String.fromCharCode(...bytes);
  return bytes
    .filter((_, index) => index % BYTES_PER_UTF16_UNIT === 1)
    .map((value) => String.fromCharCode(value))
    .join("");
}

/** Reads a "(...)" string starting at `start`; returns its text and the index after it. */
function readLiteralString(content: string, start: number): { text: string; end: number } {
  let depth = 0;
  let text = "";
  let index = start;
  for (; index < content.length; index += 1) {
    const char = content[index]!;
    if (char === "\\") {
      const next = content[index + 1] ?? "";
      const octal = OCTAL_ESCAPE.exec(content.slice(index + 1, index + 4));
      if (octal) {
        text += String.fromCharCode(parseInt(octal[0], OCTAL_RADIX));
        index += octal[0].length;
      } else {
        text += PDF_STRING_ESCAPES[next] ?? next;
        index += 1;
      }
    } else if (char === "(") {
      depth += 1;
      if (depth > 1) text += char;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) return { text, end: index + 1 };
      text += char;
    } else {
      text += char;
    }
  }
  return { text, end: index };
}

/** Plain text shown by a page's content stream, strings separated by spaces. */
export function textFromContentStream(content: string): string {
  const pieces: string[] = [];
  let current = "";
  const flush = () => {
    if (current) pieces.push(current);
    current = "";
  };

  let index = 0;
  while (index < content.length) {
    const char = content[index]!;
    if (char === "(") {
      const { text, end } = readLiteralString(content, index);
      current += text;
      index = end;
    } else if (char === "<" && content[index + 1] !== "<") {
      const close = content.indexOf(">", index);
      if (close < 0) break;
      current += decodeHexString(content.slice(index + 1, close));
      index = close + 1;
    } else if (/[A-Za-z'"*]/.test(char)) {
      const operator = OPERATOR_PATTERN.exec(content.slice(index, index + 4));
      if (operator && SEPARATING_OPERATORS.has(operator[0]) && (index === 0 || /[\s\])>)]/.test(content[index - 1]!))) {
        flush();
      }
      index += operator ? operator[0].length : 1;
    } else {
      index += 1;
    }
  }
  flush();
  // Words are often shown one at a time with their own space characters.
  return pieces.join(" ").replace(/\s+/g, " ").trim();
}

async function readPdfText(pdfBuffer: Buffer): Promise<string> {
  const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true, updateMetadata: false });
  const pageTexts: string[] = [];
  for (const page of pdf.getPages()) {
    const contents = page.node.Contents();
    const entries = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    const decoded: string[] = [];
    for (const entry of entries) {
      const stream = pdf.context.lookup(entry);
      if (stream instanceof PDFRawStream) {
        decoded.push(Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"));
      }
    }
    pageTexts.push(textFromContentStream(decoded.join("\n")));
  }
  return pageTexts.join(" ");
}

function distinct(matches: Iterable<RegExpMatchArray>, group: number): string[] {
  return [...new Set([...matches].map((match) => (match[group] ?? match[0]).replace(/\s+/g, "")))];
}

/**
 * The carrier tracking number printed on a label's text, or null when the text
 * has none or more than one (several pages): the caller then asks the AI.
 */
export function trackingFromLabelText(text: string): TrackingInfo | null {
  const ups = distinct(text.matchAll(UPS_TRACKING), 0);
  // The first FedEx pattern that finds anything decides, most specific first.
  const fedex =
    [FEDEX_BARCODE_LINE, FEDEX_TRK_LINE, FEDEX_ROUTING_LINE]
      .map((pattern) => distinct(text.matchAll(pattern), 1))
      .find((numbers) => numbers.length) ?? [];

  if (ups.length === 1 && !fedex.length) {
    return { trackingNumber: ups[0]!, carrier: "UPS", sender: null, receiver: null };
  }
  if (fedex.length === 1 && !ups.length) {
    return { trackingNumber: fedex[0]!, carrier: "FedEx", sender: null, receiver: null };
  }
  return null;
}

/** Never throws: any unreadable or unusual PDF just returns null. */
export async function extractTrackingFromPdfText(pdfBuffer: Buffer): Promise<TrackingInfo | null> {
  try {
    return trackingFromLabelText(await readPdfText(pdfBuffer));
  } catch {
    return null;
  }
}
