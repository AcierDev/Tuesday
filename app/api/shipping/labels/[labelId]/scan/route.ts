import { handleScanFutureLabel } from "@/lib/shipping-labels/scan-http";
import { createScanShippingLabelHttpDeps } from "@/lib/shipping-labels/scan-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ labelId: string }> }
) {
  const { labelId } = await params;
  const deps = await createScanShippingLabelHttpDeps();
  return handleScanFutureLabel(request, labelId, deps);
}
