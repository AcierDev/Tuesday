const HTTP_OK = 200;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Small standalone page for the Connect tab (the settings card refreshes on focus). */
export function etsyResultPage(message: string, status = HTTP_OK): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Etsy connection</title><style>body{font:16px system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e2e8f0}
main{max-width:28rem;padding:1.5rem;text-align:center}a{color:#93c5fd}</style></head>
<body><main><p>${escapeHtml(message)}</p><p><a href="/">Back to the dashboard</a></p></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
