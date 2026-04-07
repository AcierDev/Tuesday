import { NextResponse } from "next/server";
import { getShippingSettings, saveShippingSettings } from "@/lib/shipping-settings";
import { normalizeShippingSettings } from "@/config/shipping-defaults";

export async function GET() {
  try {
    const settings = await getShippingSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to load shipping settings:", error);
    return NextResponse.json(
      { error: "Failed to load shipping settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const settings = normalizeShippingSettings(payload);
    const savedSettings = await saveShippingSettings(settings);
    return NextResponse.json(savedSettings);
  } catch (error) {
    console.error("Failed to save shipping settings:", error);
    return NextResponse.json(
      { error: "Failed to save shipping settings" },
      { status: 500 }
    );
  }
}
