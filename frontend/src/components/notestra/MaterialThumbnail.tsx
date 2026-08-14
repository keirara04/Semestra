"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

interface MaterialThumbnailProps {
  materialId: number;
  width?: number;
}

// Deterministic small tilt per material: a stack of paper never lies dead
// flat, but it shouldn't visibly re-shuffle on every re-render either.
function tiltFor(materialId: number): number {
  return ((materialId % 5) - 2) * 0.7; // -1.4deg .. 1.4deg
}

// First-page thumbnail for a PDF material, rendered client-side via
// PDF.js, same signed-URL flow as the full viewer
// (mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 4). Only mounted while its
// folder is expanded, so it never fetches/renders anything off-screen.
// Styled as a small paper card (rests at a slight tilt, straightens and
// lifts on hover/focus) rather than a flat file icon: previews here are a
// stack of course papers, not app tiles. Loading state uses the existing
// `.fn-sheet` ledger-ruled-paper texture instead of a generic skeleton
// pulse, so even the "not loaded yet" moment reads as paper.
export function MaterialThumbnail({ materialId, width = 40 }: MaterialThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);

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
        if (!cancelled) {
          setAspectRatio(viewport.width / viewport.height);
          setLoaded(true);
        }
        doc.destroy();
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [materialId, width]);

  const height = aspectRatio ? width / aspectRatio : width * 1.3;
  const tilt = tiltFor(materialId);

  const cardStyle: React.CSSProperties = {
    borderColor: "var(--fn-rule)",
    width,
    height,
    transform: hovered ? "rotate(0deg) translateY(-2px)" : `rotate(${tilt}deg)`,
    transition: "transform 150ms ease, box-shadow 150ms ease",
    boxShadow: hovered ? "0 4px 10px rgba(34, 41, 51, 0.18)" : "0 1px 2px rgba(34, 41, 51, 0.08)",
  };

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  if (failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded border text-[9px] text-[var(--fn-muted)]"
        style={cardStyle}
        {...handlers}
      >
        PDF
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded border bg-[var(--fn-paper)]" style={cardStyle} {...handlers}>
      {!loaded && <div className="fn-sheet h-full w-full rounded" />}
      <canvas
        ref={canvasRef}
        className="rounded object-contain"
        style={{ width: "100%", height: "100%", display: loaded ? "block" : "none" }}
      />
    </div>
  );
}
