import { NextResponse } from "next/server";
import { getShippingSettings, saveShippingSettings } from "@/lib/shipping-settings";
import { validateShippingSettingsInput } from "@/config/shipping-defaults";

const HTTP_BAD_REQUEST = 400;

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
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Shipping settings must be sent as JSON." },
      { status: HTTP_BAD_REQUEST }
    );
  }

  const validation = validateShippingSettingsInput(payload);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: `Invalid shipping settings: ${validation.errors.join(" ")}`,
        errors: validation.errors,
      },
      { status: HTTP_BAD_REQUEST }
    );
  }

  try {
    const savedSettings = await saveShippingSettings(validation.settings);
    return NextResponse.json(savedSettings);
  } catch (error) {
    console.error("Failed to save shipping settings:", error);
    return NextResponse.json(
      { error: "Failed to save shipping settings" },
      { status: 500 }
    );
  }
}
