import { handleDeleteFutureLabel } from "@/lib/shipping-labels/http";
import { createShippingLabelHttpDeps } from "@/lib/shipping-labels/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ labelId: string }> }
) {
  const { labelId } = await params;
  const deps = await createShippingLabelHttpDeps();
  return handleDeleteFutureLabel(labelId, deps);
}
