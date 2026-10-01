export const DEFAULT_SITE_ACCESS_PASSWORD = "9876";

export const siteAccessPassword = () => process.env.SITE_ACCESS_PASSWORD || DEFAULT_SITE_ACCESS_PASSWORD;
export const siteAccessSecret = () => process.env.SITE_ACCESS_SECRET || process.env.MONGODB_URI || "";
