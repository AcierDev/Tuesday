import type { ReactNode } from "react";
import { requireDevPreviewRoute } from "@/lib/dev-preview-routes";

// Dev-only page: 404 in production unless ENABLE_DEV_PREVIEW_ROUTES is set.
export default function DevPreviewLayout({ children }: { children: ReactNode }) {
  requireDevPreviewRoute();
  return <>{children}</>;
}
