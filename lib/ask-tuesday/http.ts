import { ASK_TUESDAY, ASK_TUESDAY_HTTP, ASK_TUESDAY_NO_STORE } from "../../config/ask-tuesday";
import { searchTuesdayRecords } from "./search";
import type { AskTuesdayRequest, TuesdaySnapshot } from "./types";

type Dependencies = {
  authorize: (request: Request) => Promise<boolean>;
  load: (request: AskTuesdayRequest) => Promise<TuesdaySnapshot>;
  now: () => string;
};
const EMPTY_COUNT = 0;
const reply = (body: unknown, status: number) => Response.json(body, {status, headers: ASK_TUESDAY_NO_STORE});

function parseQuestion(value: unknown): AskTuesdayRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid question.");
  const record = value as Record<string, unknown>;
  if (typeof record.question !== "string" || !record.question.trim() || record.question.length > ASK_TUESDAY.maxQuestionLength ||
    typeof record.page !== "string" || !/^\/[a-zA-Z0-9/_-]*$/.test(record.page) || record.page.startsWith("//") ||
    (record.orderSearch !== undefined && (typeof record.orderSearch !== "string" || record.orderSearch.length > ASK_TUESDAY.maxQuestionLength))) {
    throw new Error("Enter a question or customer name within the supported length.");
  }
  return {question: record.question.trim(), page: record.page, ...(typeof record.orderSearch === "string" ? {orderSearch: record.orderSearch} : {})};
}

async function boundedBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > ASK_TUESDAY.maxBodyBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = EMPTY_COUNT;
  let content = "";
  while (true) {
    const {done, value} = await reader.read();
    if (done) return content + decoder.decode();
    bytes += value.byteLength;
    if (bytes > ASK_TUESDAY.maxBodyBytes) {await reader.cancel(); return null;}
    content += decoder.decode(value, {stream: true});
  }
}

export async function handleAskTuesday(request: Request, dependencies: Dependencies): Promise<Response> {
  if (!await dependencies.authorize(request)) return reply({error: "Site password required."}, ASK_TUESDAY_HTTP.unauthorized);
  let question: AskTuesdayRequest;
  try {
    const body = await boundedBody(request);
    if (body === null) return reply({error: "Question is too large."}, ASK_TUESDAY_HTTP.tooLarge);
    question = parseQuestion(JSON.parse(body));
  } catch {
    return reply({error: "Enter a valid question and dashboard page."}, ASK_TUESDAY_HTTP.badRequest);
  }
  try {
    const snapshot = await dependencies.load(question);
    return reply(searchTuesdayRecords(question, snapshot, dependencies.now()), ASK_TUESDAY_HTTP.ok);
  } catch {
    return reply({error: "Tuesday records could not be checked. Try again."}, ASK_TUESDAY_HTTP.failure);
  }
}
