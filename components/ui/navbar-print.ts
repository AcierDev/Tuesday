// Off-screen iframe used purely as a print surface. Shared by printPdf/printImage.
const HIDDEN_IFRAME_CSS =
  "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
// How long to leave the print iframe in the DOM before removing it, giving the
// print dialog time to read its contents.
const PRINT_IFRAME_CLEANUP_MS = 60000;

export const printPdf = (src: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = HIDDEN_IFRAME_CSS;
  iframe.src = src;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // iframe contents may not allow direct print access
    }
    window.setTimeout(() => iframe.remove(), PRINT_IFRAME_CLEANUP_MS);
  };
  document.body.appendChild(iframe);
};

export const printImage = (
  src: string,
  orientation: "landscape" | "portrait"
) => {
  const isLandscape = orientation === "landscape";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Print Label</title>
        <style>
          @page { size: ${isLandscape ? "6in 4in" : "4in 6in"}; margin: 0; }
          html, body {
            margin: 0; padding: 0;
            width: ${isLandscape ? "6in" : "4in"};
            height: ${isLandscape ? "4in" : "6in"};
            display: flex; justify-content: center; align-items: center;
          }
          img {
            max-width: 100%; max-height: 100%; object-fit: contain;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
          @media print {
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            img { image-resolution: 300dpi; }
          }
        </style>
      </head>
      <body><img src="${src}" alt="Print"/></body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = HIDDEN_IFRAME_CSS;
  iframe.srcdoc = html;
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    const img = iframe.contentDocument?.querySelector("img");
    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // noop
      }
      window.setTimeout(() => iframe.remove(), PRINT_IFRAME_CLEANUP_MS);
    };
    if (img && !img.complete) {
      img.addEventListener("load", triggerPrint, { once: true });
      img.addEventListener("error", triggerPrint, { once: true });
    } else {
      triggerPrint();
    }
  };
  document.body.appendChild(iframe);
};

// Print an arbitrary HTML document through the shared off-screen iframe.
export const printHtmlDocument = (html: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = HIDDEN_IFRAME_CSS;
  iframe.srcdoc = html;
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    try {
      win.focus();
      win.print();
    } catch {
      // noop
    }
    window.setTimeout(() => iframe.remove(), PRINT_IFRAME_CLEANUP_MS);
  };
  document.body.appendChild(iframe);
};
