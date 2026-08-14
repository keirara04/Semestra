"use client";

import { Eraser, Highlighter, MousePointer2, Pencil, Redo2, Type, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotestraTool } from "./AnnotationLayer";

const TOOLS: { id: NotestraTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pen", label: "Pen", icon: Pencil },
  { id: "highlight", label: "Highlighter", icon: Highlighter },
  { id: "text", label: "Text", icon: Type },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

interface NotestraToolbarProps {
  tool: NotestraTool;
  onToolChange: (tool: NotestraTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] focus-visible:outline-offset-2",
        active ? "bg-[var(--fn-cobalt)] text-white" : "text-[var(--fn-ink)] hover:bg-[var(--fn-canvas)]",
        disabled && "opacity-30",
      )}
    >
      {children}
    </button>
  );
}

// Floating icon toolbar: a rounded Field Notes paper card with grouped
// icon buttons, not a text-labelled bar.
export function NotestraToolbar({ tool, onToolChange, onUndo, onRedo, canUndo, canRedo }: NotestraToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-2xl border bg-[var(--fn-paper)] px-2 py-1.5 shadow-lg"
      style={{ borderColor: "var(--fn-rule)" }}
    >
      {TOOLS.map((option) => (
        <ToolbarButton
          key={option.id}
          label={option.label}
          active={tool === option.id}
          onClick={() => onToolChange(option.id)}
        >
          <option.icon size={18} />
        </ToolbarButton>
      ))}

      <div className="mx-1 h-6 w-px" style={{ background: "var(--fn-rule)" }} />

      <ToolbarButton label="Undo" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={18} />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={18} />
      </ToolbarButton>
    </div>
  );
}
