"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/client-errors";

// Replaces the root layout when it fails, so it brings its own <html>/<body>
// and inline styles (globals.css is not loaded here).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("global-error", error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          background: "rgb(17 24 39)",
          color: "rgb(243 244 246)",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px" }}>Tuesday hit an error.</h2>
        <p style={{ margin: 0, fontSize: "14px", color: "rgb(156 163 175)" }}>
          The error was reported. Try again, or reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid rgb(75 85 99)",
            background: "rgb(31 41 55)",
            color: "inherit",
            cursor: "pointer",
          }}
          type="button"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
