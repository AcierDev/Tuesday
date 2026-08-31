import { handleSummarizeFutureLabels } from "@/lib/shipping-labels/http";
import { createShippingLabelHttpDeps } from "@/lib/shipping-labels/server";

export const runtime = "nodejs";

export async function GET() {
  const deps = await createShippingLabelHttpDeps();
  return handleSummarizeFutureLabels(deps);
}
