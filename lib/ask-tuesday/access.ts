import { SITE_ACCESS_COOKIE, verifyAccessToken } from "../site-access";

export async function authorizeAskTuesday(request: Request, secret: string, now = Date.now()): Promise<boolean> {
  const token = (request.headers.get("cookie") ?? "").split(";").map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${SITE_ACCESS_COOKIE}=`))?.slice(`${SITE_ACCESS_COOKIE}=`.length);
  return verifyAccessToken(token, secret, now);
}
