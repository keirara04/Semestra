"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

interface MaterialThumbnailProps {
  materialId: number;
  width?: number;
}

// First-page thumbnail for a PDF material — rendered client-side via
// PDF.js, same signed-URL flow as the full viewer
// (mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 4). Only mounted while its
// folder is expanded, so it never fetches/renders anything off-screen.
export function MaterialThumbnail({ materialId, width = 40 }: MaterialThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { url } = await apiFetch<{ url: string }>(`/api/materials/${materialId}/view-url`);
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjsLib.getDocument(url).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        const page = await doc.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) return;

        await page.render({ canvasContext: context, viewport, canvas }).promise;
        if (!cancelled) setAspectRatio(viewport.width / viewport.height);
        doc.destroy();
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [materialId, width]);

  if (failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded border text-[9px] text-[var(--fn-muted)]"
        style={{ borderColor: "var(--fn-rule)", width, height: width * 1.3 }}
      >
        PDF
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="shrink-0 rounded border object-contain shadow-sm"
      style={{ borderColor: "var(--fn-rule)", width, height: aspectRatio ? width / aspectRatio : width * 1.3 }}
    />
  );
}
