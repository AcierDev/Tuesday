export const DEFAULT_SITE_ACCESS_PASSWORD = "9876";

// SITE_ACCESS_PASSWORD overrides the default code. Cookies are signed with
// SITE_ACCESS_SECRET; hosts that predate it fall back to MONGODB_URI so
// existing sign-ins stay valid. Set SITE_ACCESS_SECRET to decouple the two.
export const siteAccessPassword = () => process.env.SITE_ACCESS_PASSWORD || DEFAULT_SITE_ACCESS_PASSWORD;
export const siteAccessSecret = () => process.env.SITE_ACCESS_SECRET || process.env.MONGODB_URI || "";
