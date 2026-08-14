"use client";

import { Minus, Plus } from "lucide-react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface ZoomControlsProps {
  zoom: number;
  onChange: (zoom: number) => void;
}

export function ZoomControls({ zoom, onChange }: ZoomControlsProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-2xl border bg-[var(--fn-paper)] px-2 py-1.5 shadow-lg"
      style={{ borderColor: "var(--fn-rule)" }}
    >
      <button
        type="button"
        aria-label="Zoom out"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fn-ink)] hover:bg-[var(--fn-canvas)] disabled:opacity-30"
        disabled={zoom <= MIN_ZOOM}
        onClick={() => onChange(Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}
      >
        <Minus size={16} />
      </button>
      <span className="fn-mono w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        aria-label="Zoom in"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fn-ink)] hover:bg-[var(--fn-canvas)] disabled:opacity-30"
        disabled={zoom >= MAX_ZOOM}
        onClick={() => onChange(Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
