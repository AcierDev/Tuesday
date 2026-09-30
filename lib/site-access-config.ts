export const DEFAULT_SITE_ACCESS_PASSWORD = "9876";
export const DEFAULT_SITE_ACCESS_SECRET = "xlkVedaZMhmBWFgUd2hbT4Logm4c8SPgE58EvbMpABLR4RO6o0_6fHi9MHplllYS";

export const siteAccessPassword = () => process.env.SITE_ACCESS_PASSWORD || DEFAULT_SITE_ACCESS_PASSWORD;
export const siteAccessSecret = () => process.env.SITE_ACCESS_SECRET || DEFAULT_SITE_ACCESS_SECRET;
