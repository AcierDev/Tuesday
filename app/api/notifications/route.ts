import { AlertManager, AlertsNotConfiguredError } from "@/backend/src/AlertManager";
import { NextResponse } from "next/server";
import { createMinuteThrottle, orderNotificationMessage, parseOrderNotification } from "./notification";

const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVICE_UNAVAILABLE = 503;

const allowNotification = createMinuteThrottle();

export async function POST(request: Request) {
  let notification: ReturnType<typeof parseOrderNotification>;
  try {
    notification = parseOrderNotification(await request.json());
  } catch {
    notification = null;
  }
  if (!notification) {
    return NextResponse.json({ error: "Customer name, size and design are required" }, { status: HTTP_BAD_REQUEST });
  }
  if (!allowNotification()) {
    console.warn("Order notification skipped: per-minute limit reached.");
    return NextResponse.json({ error: "Too many notifications. Try again in a minute." }, { status: HTTP_TOO_MANY_REQUESTS });
  }

  try {
    await AlertManager.sendText("Ben & Akiva & Alex", "New Message", orderNotificationMessage(notification));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AlertsNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: HTTP_SERVICE_UNAVAILABLE });
    }
    console.error("Failed to send notification:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
