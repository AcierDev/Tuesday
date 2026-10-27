"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

const NAVIGATION = { firstPage: 1, step: 1, slidePx: 16, durationSeconds: 0.22, pressScale: 0.97 };

const PDF_CONTENT_TYPE = "application/pdf";
const LOAD_ERROR_MESSAGE = "Labels could not be loaded.";
// A label normally downloads in about a second. A stalled request is cut off
// and retried on its own instead of leaving the dialog waiting for a manual
// retry; each retry waits longer in case the server is only slow, not stuck.
const FETCH_TIMEOUTS_MS = [8_000, 12_000, 20_000] as const;
const RETRY_DELAY_MS = 400;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;
const HTTP_TOO_MANY_REQUESTS = 429;
const FIRST_ATTEMPT = 1;

class PermanentLoadError extends Error {}

const isCanceled = (signal: AbortSignal) => signal.aborted;
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });

/** Downloads one label, retrying timeouts, network errors and 5xx responses. */
async function fetchLabelBytes(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  for (let attempt = FIRST_ATTEMPT; ; attempt++) {
    const attemptController = new AbortController();
    const cancel = () => attemptController.abort();
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, FETCH_TIMEOUTS_MS[attempt - FIRST_ATTEMPT]);
    try {
      const response = await fetch(url, { signal: attemptController.signal });
      if (response.ok) return await response.arrayBuffer();
      const retryable = response.status >= HTTP_SERVER_ERROR_MIN || response.status === HTTP_TOO_MANY_REQUESTS;
      if (!retryable && response.status >= HTTP_CLIENT_ERROR_MIN) throw new PermanentLoadError(LOAD_ERROR_MESSAGE);
    } catch (cause) {
      if (isCanceled(signal) || cause instanceof PermanentLoadError) throw cause;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
    if (attempt >= FETCH_TIMEOUTS_MS.length) throw new Error(LOAD_ERROR_MESSAGE);
    await wait(RETRY_DELAY_MS, signal);
    if (isCanceled(signal)) throw new DOMException("Aborted", "AbortError");
  }
}

export function CombinedLabelPreview({
  urls,
  height,
  orderId,
}: {
  urls: string[];
  height: string;
  orderId: string;
}) {
  const sources = JSON.stringify(urls);
  const [preview, setPreview] = useState<{ sources: string; url: string; pageCount: number } | null>(null);
  const [page, setPage] = useState(NAVIGATION.firstPage);
  const [direction, setDirection] = useState(NAVIGATION.step);
  const reducedMotion = useReducedMotion();
  const [error, setError] = useState<string | null>(null);
  // Bumped by "Try again" to run the load effect once more.
  const [loadRun, setLoadRun] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setError(null);
    setPage(NAVIGATION.firstPage);

    async function prepare() {
      const sourceUrls: string[] = JSON.parse(sources);
      if (!sourceUrls.length) return;
      try {
        const { PDFDocument } = await import("pdf-lib");
        const documents = await Promise.all(sourceUrls.map(async (url) =>
          PDFDocument.load(await fetchLabelBytes(url, controller.signal))
        ));
        const merged = await PDFDocument.create();
        for (const document of documents) {
          const pages = await merged.copyPages(document, document.getPageIndices());
          pages.forEach((page) => merged.addPage(page));
        }
        const bytes = await merged.save();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: PDF_CONTENT_TYPE }));
        setPreview({ sources, url: objectUrl, pageCount: merged.getPageCount() });
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : LOAD_ERROR_MESSAGE);
        }
      }
    }
    void prepare();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sources, loadRun]);

  if (!urls.length) return null;
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 p-3 text-sm">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => setLoadRun((run) => run + 1)}
          className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Try again
        </button>
      </div>
    );
  }
  if (preview?.sources !== sources) {
    return (
      <p role="status" className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading labels…
      </p>
    );
  }
  const hasMultipleLabels = preview.pageCount > NAVIGATION.firstPage;
  const changePage = (step: number) => {
    setDirection(step);
    setPage(current => Math.max(NAVIGATION.firstPage, Math.min(preview.pageCount, current + step)));
  };
  return (
    <div className="flex min-h-0 flex-col gap-3" style={{ height }}>
      {hasMultipleLabels && (
        <nav aria-label="Label navigation" className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-blue-400/25 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-3">
          <button
            type="button"
            aria-label="Previous label"
            disabled={page === NAVIGATION.firstPage}
            onClick={() => changePage(-NAVIGATION.step)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-400/20 px-3 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <div role="status" aria-live="polite" className="text-center">
            <p className="text-xs font-medium text-muted-foreground">Shipping labels</p>
            <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">Label {page} of {preview.pageCount}</p>
          </div>
          <motion.button
            type="button"
            aria-label="Next label"
            disabled={page === preview.pageCount}
            onClick={() => changePage(NAVIGATION.step)}
            whileTap={reducedMotion ? undefined : { scale: NAVIGATION.pressScale }}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-shadow hover:shadow-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
          >
            Next label
            <ArrowRight className="h-5 w-5 transition-transform motion-safe:group-hover:translate-x-1" />
          </motion.button>
        </nav>
      )}
      <motion.div
        key={`${preview.url}-${page}`}
        initial={reducedMotion ? false : { opacity: 0, x: direction * NAVIGATION.slidePx }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reducedMotion ? 0 : NAVIGATION.durationSeconds, ease: "easeOut" }}
        className="min-h-0 flex-1 overflow-hidden rounded-xl"
      >
        <iframe
          src={hasMultipleLabels ? `${preview.url}#page=${page}` : preview.url}
          width="100%"
          height="100%"
          className="h-full rounded-xl border-0"
          title={`Shipping labels for Order ${orderId}`}
        />
      </motion.div>
    </div>
  );
}
