"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

const NAVIGATION = { firstPage: 1, step: 1, slidePx: 16, durationSeconds: 0.22, pressScale: 0.97 };

const PDF_CONTENT_TYPE = "application/pdf";

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
        const documents = await Promise.all(sourceUrls.map(async (url) => {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error("Labels could not be loaded.");
          return PDFDocument.load(await response.arrayBuffer());
        }));
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
          setError(cause instanceof Error ? cause.message : "Labels could not be loaded.");
        }
      }
    }
    void prepare();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sources]);

  if (!urls.length) return null;
  if (error) return <p role="alert">{error}</p>;
  if (preview?.sources !== sources) return <p>Loading labels…</p>;
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
