"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Annotation, Material } from "@/lib/types";
import { PDFViewer } from "@/components/notestra/PDFViewer";
import { AnnotationLayer, type NotestraTool } from "@/components/notestra/AnnotationLayer";
import { NotestraToolbar } from "@/components/notestra/NotestraToolbar";
import { PageNavigation } from "@/components/notestra/PageNavigation";
import { ZoomControls } from "@/components/notestra/ZoomControls";
import { NotesPanel } from "@/components/notestra/NotesPanel";
import { useAnnotationSync } from "@/lib/notestra/use-annotation-sync";
import { useReadingPosition } from "@/lib/notestra/use-reading-position";

const SAVE_LABEL: Record<string, string> = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed",
};

// Notestra — in-browser PDF annotation workspace, see
// mdfile/NOTESTRA_FUNCTIONAL_SPEC.md. Full-viewport overlay rather than a
// route-tree layout change, since (app)/layout.tsx always wraps children in
// AppShell chrome and there's no existing opt-out precedent to build on.
// Layout (gray canvas, floating toolbar/page-nav pills, white page card) is
// modelled on a provided reference screenshot rather than the fn-* house
// style used elsewhere in the app — Notestra is a focused workspace, not a
// form-driven page.
export default function NotestraPage({
  params,
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = use(params);
  const id = Number(materialId);

  const [material, setMaterial] = useState<Material | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState<NotestraTool>("select");
  const [showNotes, setShowNotes] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sync = useAnnotationSync(id);
  const { savePosition } = useReadingPosition(id, (restoredPage, restoredZoom) => {
    setPage(restoredPage);
    setZoom(restoredZoom);
  });

  useEffect(() => {
    apiFetch<Material>(`/api/materials/${id}`).then(setMaterial);
    apiFetch<{ url: string }>(`/api/materials/${id}/view-url`).then((res) => setViewerUrl(res.url));
    apiFetch<Annotation[]>(`/api/materials/${id}/annotations`).then(sync.setInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    savePosition(page, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, zoom]);

  const pageAnnotations = sync.annotations.filter((a) => a.page_number === page);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#eceef1" }}>
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/courses/${material?.course_id ?? ""}`}
            className="flex items-center gap-1 text-sm text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
          >
            <ArrowLeft size={16} />
            Exit
          </Link>
          <span className="truncate font-medium">{material?.title ?? "Loading…"}</span>
        </div>

        <span className="fn-mono shrink-0 text-sm text-[var(--fn-muted)]">
          {SAVE_LABEL[sync.saveState]}
          {sync.saveState === "error" && (
            <button type="button" className="ml-2 underline" onClick={sync.retry}>
              Retry
            </button>
          )}
        </span>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="z-10 flex shrink-0 items-center justify-center gap-3 px-4 pb-4">
            <NotestraToolbar
              tool={tool}
              onToolChange={setTool}
              onUndo={sync.undo}
              onRedo={sync.redo}
              canUndo={sync.canUndo}
              canRedo={sync.canRedo}
            />
            <ZoomControls zoom={zoom} onChange={setZoom} />
          </div>

          <div className="relative flex-1 overflow-auto px-8 pb-24">
            <div className="flex min-h-full items-start justify-center">
              {loadError && <p className="mt-8 text-[var(--fn-oxide)]">{loadError}</p>}
              {!loadError && (
                <div
                  className="relative rounded-2xl bg-white shadow-xl"
                  style={{ width: pageSize.width || undefined, height: pageSize.height || undefined }}
                >
                  <PDFViewer
                    url={viewerUrl}
                    page={page}
                    zoom={zoom}
                    canvasRef={canvasRef}
                    onDocumentLoad={setNumPages}
                    onPageRender={setPageSize}
                    onError={setLoadError}
                  />
                  {pageSize.width > 0 && (
                    <AnnotationLayer
                      pageNumber={page}
                      pageWidth={pageSize.width}
                      pageHeight={pageSize.height}
                      annotations={pageAnnotations}
                      tool={tool}
                      onCreate={sync.createAnnotation}
                      onUpdate={sync.updateAnnotation}
                      onDelete={sync.deleteAnnotation}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <div className="pointer-events-auto">
              <PageNavigation
                page={page}
                totalPages={numPages || 1}
                onChange={setPage}
                showNotes={showNotes}
                onToggleNotes={() => setShowNotes((v) => !v)}
              />
            </div>
          </div>
        </div>

        {showNotes && (
          <aside
            className="w-80 shrink-0 overflow-y-auto border-l bg-[var(--fn-paper)] p-4"
            style={{ borderColor: "var(--fn-rule)" }}
          >
            <NotesPanel materialId={id} currentPage={page} />
          </aside>
        )}
      </div>
    </div>
  );
}
