import type { AskTuesdayResult } from "./types";

type MessageLink = {href: string; label: "View messages" | "Open Etsy inbox"};

const ETSY_HOST = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*etsy\.com$/i;
const HTTPS_AUTHORITY = /^https:\/\/(?<authority>[^/?#]+)/i;
const CONVERSATION_PATH = /^\/messages\/[^/]+\/?$/;
const INBOX_PATHS = new Set(["/messages", "/messages/"]);

export function messageLinkFor(result: AskTuesdayResult): MessageLink | null {
  let inbox: MessageLink | null = null;
  for (const {href} of result.sources) {
    // Check the supplied authority too: URL removes an explicit default port.
    const authority = HTTPS_AUTHORITY.exec(href)?.groups?.authority;
    if (!authority || !ETSY_HOST.test(authority) || /[\s\\]/.test(href)) continue;
    try {
      const url = new URL(href);
      if (url.protocol !== "https:" || url.username || url.password || url.port || !ETSY_HOST.test(url.hostname)) continue;
      if (CONVERSATION_PATH.test(url.pathname)) return {href, label: "View messages"};
      if (INBOX_PATHS.has(url.pathname)) inbox ??= {href, label: "Open Etsy inbox"};
    } catch {
      // A malformed saved source must not hide a later valid source.
    }
  }
  return inbox;
}
