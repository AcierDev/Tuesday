import { handleListFutureLabels } from "@/lib/shipping-labels/http";
import { createShippingLabelHttpDeps } from "@/lib/shipping-labels/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const deps = await createShippingLabelHttpDeps();
  return handleListFutureLabels(new URL(request.url).searchParams, deps);
}
