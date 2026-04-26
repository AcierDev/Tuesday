import { NextResponse } from "next/server";
import { fetchFedExRates } from "@/lib/fedex-api";
import { normalizeShippingSettings } from "@/config/shipping-defaults";
import { type ShippingAddressInput, type ShippingBoxPreset } from "@/typings/types";

export const runtime = "nodejs";

function hasInvalidPackage(packages: ShippingBoxPreset[]) {
  return packages.some(
    (pkg) =>
      !pkg.length ||
      !pkg.width ||
      !pkg.height ||
      !pkg.weight ||
      Number(pkg.length) <= 0 ||
      Number(pkg.width) <= 0 ||
      Number(pkg.height) <= 0 ||
      Number(pkg.weight) <= 0
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const shipFrom = payload.shipFrom as ShippingAddressInput;
    const shipTo = payload.shipTo as ShippingAddressInput;
    const packages = payload.packages as ShippingBoxPreset[];
    const purchaseDefaults = normalizeShippingSettings({
      purchaseDefaults: payload.purchaseDefaults,
    }).purchaseDefaults;

    if (!shipFrom?.postalCode || !shipTo?.postalCode || !shipTo?.country) {
      return NextResponse.json(
        { error: "Ship-from and recipient postal details are required." },
        { status: 400 }
      );
    }

    if (!packages?.length || hasInvalidPackage(packages)) {
      return NextResponse.json(
        { error: "Each package must include positive dimensions and weight." },
        { status: 400 }
      );
    }

    const rates = await fetchFedExRates({
      shipFrom,
      shipTo,
      packages,
      purchaseDefaults,
    });

    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Failed to fetch FedEx rates:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch FedEx rates",
      },
      { status: 500 }
    );
  }
}
