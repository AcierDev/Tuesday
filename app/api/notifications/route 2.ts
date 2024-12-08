import { AlertManager } from "@/backend/src/AlertManager";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { customerName, size, design } = await request.json();

    const message = `New Order Submitted:\nCustomer: ${customerName}\nSize: ${size}\nDesign: ${design}`;

    await AlertManager.sendText("Ben & Akiva", "New Message", message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
