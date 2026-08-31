import { handleFutureLabelUpload } from "@/lib/shipping-labels/http";
import { createShippingLabelHttpDeps } from "@/lib/shipping-labels/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const deps = await createShippingLabelHttpDeps();
  return handleFutureLabelUpload(request, deps);
}
