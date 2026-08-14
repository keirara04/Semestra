"use client";

import { useRef, useState } from "react";
import type { Annotation } from "@/lib/types";
import { pointToNormalized, toNormalized, toPixels } from "@/lib/notestra/coordinates";

export type NotestraTool = "select" | "pen" | "highlight" | "text" | "eraser";

interface AnnotationLayerProps {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  annotations: Annotation[];
  tool: NotestraTool;
  onCreate: (annotation: Annotation) => void;
  onUpdate: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
}

const HIGHLIGHT_COLOR = "#FFE66D";
const PEN_COLOR = "#222933";
const PEN_STROKE_WIDTH = 0.004; // normalized, relative to page width

function newClientUuid(): string {
  return crypto.randomUUID();
}

// SVG overlay above the PDF.js canvas — the decided MVP rendering approach
// (not raw canvas, not HTML divs) per mdfile/NOTESTRA_FUNCTIONAL_SPEC.md,
// Section 6: each annotation is an addressable node carrying its own
// client_uuid, which is what makes hit-testing/deletion and normalized
// coordinate <-> export mapping straightforward. All four tools share one
// pointer-event surface over the same SVG rather than four separate
// components, since they never need to be interactive simultaneously and
// splitting them would mean re-deriving the same page-relative pointer math
// four times for no behavioural gain.
export function AnnotationLayer({
  pageNumber,
  pageWidth,
  pageHeight,
  annotations,
  tool,
  onCreate,
  onUpdate,
  onDelete,
}: AnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draftPoints, setDraftPoints] = useState<[number, number][] | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [editingText, setEditingText] = useState<
    { id: string; x: number; y: number; value: string; isExisting: boolean } | null
  >(null);

  function pointerPosition(event: React.PointerEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (tool === "select" || tool === "eraser") return;
    const { x, y } = pointerPosition(event);

    if (tool === "pen") {
      setDraftPoints([[x, y]]);
    } else if (tool === "highlight") {
      dragStart.current = { x, y };
      setDraftRect({ x, y, width: 0, height: 0 });
    } else if (tool === "text") {
      setEditingText({ id: newClientUuid(), x, y, value: "", isExisting: false });
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (tool === "pen" && draftPoints) {
      const { x, y } = pointerPosition(event);
      setDraftPoints((points) => (points ? [...points, [x, y]] : points));
    } else if (tool === "highlight" && dragStart.current) {
      const { x, y } = pointerPosition(event);
      const start = dragStart.current;
      setDraftRect({
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        width: Math.abs(x - start.x),
        height: Math.abs(y - start.y),
      });
    }
  }

  function handlePointerUp() {
    if (tool === "pen" && draftPoints && draftPoints.length > 1) {
      const points = draftPoints.map((p) => pointToNormalized(p, pageWidth, pageHeight));
      onCreate({
        id: newClientUuid(),
        material_id: 0, // filled in by the caller before syncing
        page_number: pageNumber,
        type: "drawing",
        data: { points, stroke_width: PEN_STROKE_WIDTH, color: PEN_COLOR },
      });
    }
    setDraftPoints(null);

    if (tool === "highlight" && draftRect && draftRect.width > 2 && draftRect.height > 2) {
      onCreate({
        id: newClientUuid(),
        material_id: 0,
        page_number: pageNumber,
        type: "highlight",
        data: {
          x: toNormalized(draftRect.x, pageWidth),
          y: toNormalized(draftRect.y, pageHeight),
          width: toNormalized(draftRect.width, pageWidth),
          height: toNormalized(draftRect.height, pageHeight),
          color: HIGHLIGHT_COLOR,
          opacity: 0.5,
        },
      });
    }
    setDraftRect(null);
    dragStart.current = null;
  }

  function commitTextEdit() {
    if (!editingText) return;
    if (editingText.value.trim() !== "") {
      const annotation: Annotation = {
        id: editingText.id,
        material_id: 0,
        page_number: pageNumber,
        type: "text",
        data: {
          x: toNormalized(editingText.x, pageWidth),
          y: toNormalized(editingText.y, pageHeight),
          font_size: 0.018,
          color: PEN_COLOR,
          text: editingText.value,
        },
      };
      if (editingText.isExisting) {
        onUpdate(annotation);
      } else {
        onCreate(annotation);
      }
    }
    setEditingText(null);
  }

  function handleAnnotationClick(annotation: Annotation) {
    if (tool === "eraser") {
      onDelete(annotation.id);
    } else if (tool === "select" && annotation.type === "text") {
      setEditingText({
        id: annotation.id,
        x: toPixels(annotation.data.x ?? 0, pageWidth),
        y: toPixels(annotation.data.y ?? 0, pageHeight),
        value: annotation.data.text ?? "",
        isExisting: true,
      });
    }
  }

  return (
    <svg
      ref={svgRef}
      width={pageWidth}
      height={pageHeight}
      className="absolute inset-0"
      style={{ touchAction: "none", cursor: tool === "select" ? "default" : "crosshair" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {annotations.map((annotation) => (
        <AnnotationShape
          key={annotation.id}
          annotation={annotation}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          onClick={() => handleAnnotationClick(annotation)}
        />
      ))}

      {draftPoints && draftPoints.length > 1 && (
        <polyline
          points={draftPoints.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={PEN_COLOR}
          strokeWidth={PEN_STROKE_WIDTH * pageWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {draftRect && (
        <rect
          x={draftRect.x}
          y={draftRect.y}
          width={draftRect.width}
          height={draftRect.height}
          fill={HIGHLIGHT_COLOR}
          opacity={0.5}
        />
      )}

      {editingText && (
        <foreignObject x={editingText.x} y={editingText.y} width={220} height={40}>
          <input
            autoFocus
            className="fn-input w-full"
            value={editingText.value}
            onChange={(event) => setEditingText({ ...editingText, value: event.target.value })}
            onBlur={commitTextEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitTextEdit();
              if (event.key === "Escape") setEditingText(null);
            }}
          />
        </foreignObject>
      )}
    </svg>
  );
}

function AnnotationShape({
  annotation,
  pageWidth,
  pageHeight,
  onClick,
}: {
  annotation: Annotation;
  pageWidth: number;
  pageHeight: number;
  onClick: () => void;
}) {
  const { data } = annotation;

  if (annotation.type === "drawing" && data.points) {
    const points = data.points
      .map(([x, y]) => `${toPixels(x, pageWidth)},${toPixels(y, pageHeight)}`)
      .join(" ");
    return (
      <polyline
        data-id={annotation.id}
        points={points}
        fill="none"
        stroke={data.color ?? PEN_COLOR}
        strokeWidth={(data.stroke_width ?? PEN_STROKE_WIDTH) * pageWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        onClick={onClick}
        className="cursor-pointer"
      />
    );
  }

  if (annotation.type === "highlight") {
    return (
      <rect
        data-id={annotation.id}
        x={toPixels(data.x ?? 0, pageWidth)}
        y={toPixels(data.y ?? 0, pageHeight)}
        width={toPixels(data.width ?? 0, pageWidth)}
        height={toPixels(data.height ?? 0, pageHeight)}
        fill={data.color ?? HIGHLIGHT_COLOR}
        opacity={data.opacity ?? 0.5}
        onClick={onClick}
        className="cursor-pointer"
      />
    );
  }

  if (annotation.type === "text") {
    return (
      <text
        data-id={annotation.id}
        x={toPixels(data.x ?? 0, pageWidth)}
        y={toPixels(data.y ?? 0, pageHeight) + (data.font_size ?? 0.018) * pageHeight}
        fontSize={(data.font_size ?? 0.018) * pageHeight}
        fill={data.color ?? PEN_COLOR}
        onClick={onClick}
        className="cursor-pointer"
      >
        {data.text}
      </text>
    );
  }

  return null;
}
