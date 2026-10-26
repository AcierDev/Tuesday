import { notFound } from "next/navigation";

// Design mockups, the icon sheet and the codebase map are dev tools. They 404
// in production builds unless this env var is set to one of ENABLED_VALUES.
export const DEV_PREVIEW_ROUTES_ENV_FLAG = "ENABLE_DEV_PREVIEW_ROUTES";
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export function devPreviewRoutesEnabled(
  environment: Record<string, string | undefined> = process.env
): boolean {
  if (environment.NODE_ENV !== "production") return true;
  const flag = environment[DEV_PREVIEW_ROUTES_ENV_FLAG]?.trim().toLowerCase() ?? "";
  return ENABLED_VALUES.has(flag);
}

/** Call from a dev-only route's server layout; renders the 404 page when gated. */
export function requireDevPreviewRoute(): void {
  if (!devPreviewRoutesEnabled()) notFound();
}
