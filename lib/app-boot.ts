export const SITE_ACCESS_PATH = "/access";

// Stores start loading protected data when their modules load. Skip that on
// the server and on the password page (signing in does a full page load, so
// the stores boot normally afterwards).
export function shouldBootAppData(): boolean {
  return typeof window !== "undefined" && window.location?.pathname !== SITE_ACCESS_PATH;
}
