"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

import { BulletinNote } from "../types";

const colorClasses: Record<BulletinNote["color"], string> = {
  red: "bg-rose-100 text-rose-950 border-t-[6px] border-rose-200",
  green: "bg-emerald-100 text-emerald-950 border-t-[6px] border-emerald-200",
  blue: "text-sky-950 border-t-[6px] border-sky-200",
  yellow: "bg-amber-100 text-amber-950 border-t-[6px] border-amber-200",
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
      className={`absolute rounded-none border border-black/5 ${colorClasses[note.color]} ${
        isDragging ? "z-30 cursor-grabbing transition-none" : "z-10 cursor-grab transition-[left,top,transform,box-shadow] duration-200 hover:scale-[1.03]"
      }`}
      style={{
        left: note.x,
        top: note.y,
        width: STICKY_NOTE_WIDTH,
        height: STICKY_NOTE_HEIGHT,
        transform: `rotate(${note.rotationDeg}deg)`,
        ...colorStyles[note.color],
        boxShadow: "2px 4px 12px rgba(0,0,0,0.08)",
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
            className="h-full w-full resize-none bg-transparent text-lg leading-6 text-inherit outline-none placeholder:text-slate-500/70"
            style={{ fontFamily: '"Gochi Hand", cursive' }}
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
          <p className="max-h-full overflow-hidden whitespace-pre-wrap text-lg leading-6" style={{ fontFamily: '"Gochi Hand", cursive' }}>
            {note.text}
          </p>
        )}
      </div>
    </div>
  );
}
