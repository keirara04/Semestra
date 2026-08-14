"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

const QUICKLOOK_WIDTH = 520;

interface MaterialQuickLookProps {
  materialId: number;
  title: string;
  onClose: () => void;
}

// Click-to-preview modal for a material row: a first look at the full
// first page before committing to opening the full Notestra editor.
// Hand-rolled (no Dialog primitive exists in components/ui/ yet, see the
// earlier frontend-patterns audit) rather than pulling in a new dependency
// for one modal.
export function MaterialQuickLook({ materialId, title, onClose }: MaterialQuickLookProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
        const viewport = page.getViewport({ scale: QUICKLOOK_WIDTH / baseViewport.width });

        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) return;

        await page.render({ canvasContext: context, viewport, canvas }).promise;
        doc.destroy();
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load a preview for this PDF.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [materialId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(34, 41, 51, 0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${title}`}
    >
      <div
        className="animate-in fade-in zoom-in-95 flex max-h-full flex-col overflow-hidden rounded-2xl bg-[var(--fn-paper)] shadow-2xl duration-150"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3" style={{ borderColor: "var(--fn-rule)" }}>
          <span className="truncate font-medium">{title}</span>
          <div className="flex shrink-0 items-center gap-3">
            <Link href={`/notestra/${materialId}`} className="fn-btn-primary px-3 py-1 text-sm">
              Open in Notestra
            </Link>
            <button
              type="button"
              aria-label="Close preview"
              onClick={onClose}
              className="rounded text-[var(--fn-muted)] hover:text-[var(--fn-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] focus-visible:outline-offset-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-auto p-4">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <div
                className="fn-sheet rounded border"
                style={{ borderColor: "var(--fn-rule)", width: QUICKLOOK_WIDTH * 0.75, height: QUICKLOOK_WIDTH * 0.97 }}
              />
              <p className="fn-mono text-xs text-[var(--fn-muted)]">Loading preview…</p>
            </div>
          )}
          {error && <p className="text-sm text-[var(--fn-oxide)]">{error}</p>}
          <canvas ref={canvasRef} className="rounded shadow-sm" style={{ display: loading || error ? "none" : "block" }} />
        </div>
      </div>
    </div>
  );
}
