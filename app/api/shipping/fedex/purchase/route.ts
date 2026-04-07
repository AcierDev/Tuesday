import { NextResponse } from "next/server";
import { getDb } from "@/app/api/db/connect";
import { normalizeShippingSettings } from "@/config/shipping-defaults";
import { createAndStoreTracker } from "@/lib/easypost-tracking";
import { purchaseFedExShipment } from "@/lib/fedex-api";
import { getNextLabelFilename, getPublicUrl, uploadLabel } from "@/lib/s3-client";
import {
  type Item,
  type PurchasedShipment,
  type ShippingAddressInput,
  type ShippingPackagePreset,
} from "@/typings/types";

export const runtime = "nodejs";

function hasInvalidPackage(packages: ShippingPackagePreset[]) {
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
    const orderId = payload.orderId as string;
    const shipFrom = payload.shipFrom as ShippingAddressInput;
    const shipTo = payload.shipTo as ShippingAddressInput;
    const packages = payload.packages as ShippingPackagePreset[];
    const serviceType = payload.serviceType as string;
    const purchaseDefaults = normalizeShippingSettings({
      purchaseDefaults: payload.purchaseDefaults,
    }).purchaseDefaults;

    if (
      !orderId ||
      !serviceType ||
      !shipFrom ||
      !shipTo ||
      !packages?.length ||
      hasInvalidPackage(packages)
    ) {
      return NextResponse.json(
        { error: "Missing required shipment fields." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection<Item>(`items-${process.env.NEXT_PUBLIC_MODE}`);
    const existingItem = await collection.findOne({ id: orderId });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Order not found while saving purchased shipment." },
        { status: 404 }
      );
    }

    const purchaseResult = await purchaseFedExShipment({
      shipFrom,
      shipTo,
      packages,
      serviceType,
      purchaseDefaults,
    });

    const labelFilename = await getNextLabelFilename(orderId);
    await uploadLabel(labelFilename, purchaseResult.labelBuffer, "application/pdf");
    await createAndStoreTracker(orderId, purchaseResult.trackingNumber, "FedEx");

    const purchasedShipment: PurchasedShipment = {
      orderId,
      carrier: "FedEx",
      serviceType: purchaseResult.serviceType,
      serviceName: purchaseResult.serviceName,
      trackingNumber: purchaseResult.trackingNumber,
      labelFilename,
      labelUrl: getPublicUrl(labelFilename),
      totalNetCharge: purchaseResult.totalNetCharge,
      currency: purchaseResult.currency,
      packages,
      shipFrom,
      shipTo,
      purchasedAt: Date.now(),
    };

    await collection.updateOne(
      { id: orderId },
      {
        $set: {
          purchasedShipment,
          shipping: purchaseResult.trackingNumber,
          labels: labelFilename,
        },
      }
    );

    return NextResponse.json({ purchasedShipment });
  } catch (error) {
    console.error("Failed to purchase FedEx shipment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to purchase FedEx shipment",
      },
      { status: 500 }
    );
  }
}
