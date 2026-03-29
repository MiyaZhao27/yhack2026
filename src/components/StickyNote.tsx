"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

import { BulletinNote } from "../types";

const colorClasses: Record<BulletinNote["color"], string> = {
  red: "bg-rose-200/95 text-rose-950",
  green: "bg-emerald-200/95 text-emerald-950",
  blue: "text-sky-950",
  yellow: "bg-amber-200/95 text-amber-950",
};

const colorStyles: Record<BulletinNote["color"], { backgroundColor?: string }> = {
  red: {},
  green: {},
  blue: { backgroundColor: "#7dd3fc" },
  yellow: {},
};

export const STICKY_NOTE_WIDTH = 164;
export const STICKY_NOTE_HEIGHT = 164;

export function StickyNote({
  note,
  isDragging,
  onDelete,
  onDragStart,
  onTextCommit,
}: {
  note: BulletinNote;
  isDragging: boolean;
  onDelete: (id: string) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>, note: BulletinNote) => void;
  onTextCommit: (id: string, text: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(note.text);
    }
  }, [isEditing, note.text]);

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.select();
  }, [isEditing]);

  const commitDraft = () => {
    setIsEditing(false);
    onTextCommit(note._id, draft.trim() || "New note");
  };

  return (
    <div
      className={`absolute rounded-none border border-white/60 shadow-[0_18px_30px_rgba(15,23,42,0.16)] ${colorClasses[note.color]} ${
        isDragging ? "z-30 cursor-grabbing transition-none" : "z-10 cursor-grab transition-[left,top,transform,box-shadow] duration-200"
      }`}
      style={{
        left: note.x,
        top: note.y,
        width: STICKY_NOTE_WIDTH,
        height: STICKY_NOTE_HEIGHT,
        transform: `rotate(${note.rotationDeg}deg)`,
        ...colorStyles[note.color],
      }}
      onPointerDown={(event) => {
        if (isEditing) return;
        onDragStart(event, note);
      }}
      onDoubleClick={() => setIsEditing(true)}
    >
      <button
        type="button"
        aria-label="Delete note"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-sm font-semibold text-slate-600 transition hover:bg-white"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(note._id);
        }}
      >
        x
      </button>
      <div className="h-full p-5 pt-11">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="h-full w-full resize-none bg-transparent text-sm leading-6 text-inherit outline-none placeholder:text-slate-500/70"
            placeholder="Leave a quick note..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                commitDraft();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraft(note.text);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <p className="max-h-full overflow-hidden whitespace-pre-wrap text-sm font-medium leading-6">{note.text}</p>
        )}
      </div>
    </div>
  );
}
