"use client";

import { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PDFViewerProps {
  url: string | null;
  page: number;
  zoom: number;
  onDocumentLoad: (numPages: number) => void;
  onPageRender: (size: { width: number; height: number }) => void;
  onError: (message: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// Single-page-at-a-time renderer, driven by PDF.js — see
// mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 5. The worker is resolved as a
// module URL (not a CDN string) since Next 16/Turbopack has no built-in
// pdf.js asset wiring to lean on.
export function PDFViewer({ url, page, zoom, onDocumentLoad, onPageRender, onError, canvasRef }: PDFViewerProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    (async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      try {
        const loaded = await pdfjsLib.getDocument(url).promise;
        if (cancelled) {
          loaded.destroy();
          return;
        }
        setDoc(loaded);
        onDocumentLoad(loaded.numPages);
      } catch {
        if (!cancelled) onError("Could not load this PDF.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    return () => {
      doc?.destroy();
    };
  }, [doc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    let cancelled = false;

    (async () => {
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;

      const viewport = pdfPage.getViewport({ scale: zoom });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) return;

      await pdfPage.render({ canvasContext: context, viewport, canvas }).promise;
      if (!cancelled) onPageRender({ width: viewport.width, height: viewport.height });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, page, zoom]);

  return <canvas ref={canvasRef} className="block" />;
}
