"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

import { BulletinNote } from "../types";

const colorClasses: Record<BulletinNote["color"], string> = {
  red: "bg-[#ffe0ea] text-[#7d1940] border-[#f4a8c4]",
  green: "bg-[#dcf7e6] text-[#16543e] border-[#9ee3b9]",
  blue: "bg-[#dff1ff] text-[#1b4f7a] border-[#9bcdf3]",
  yellow: "bg-[#fff3c8] text-[#7a5a12] border-[#f0d67a]",
};

const pinClasses: Record<BulletinNote["color"], string> = {
  red: "bg-[#f06790]",
  green: "bg-[#41bf80]",
  blue: "bg-[#34a4e0]",
  yellow: "bg-[#f3c325]",
};

export const STICKY_NOTE_WIDTH = 176;
export const STICKY_NOTE_HEIGHT = 168;

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
      className={`absolute rounded-md border-2 px-4 pb-3 pt-8 shadow-[0_16px_28px_-14px_rgba(48,34,15,0.55)] ${colorClasses[note.color]} ${
        isDragging
          ? "z-30 cursor-grabbing transition-none"
          : "z-10 cursor-grab transition-[left,top,transform,box-shadow] duration-200 hover:shadow-[0_20px_30px_-16px_rgba(48,34,15,0.68)]"
      }`}
      style={{
        left: note.x,
        top: note.y,
        width: STICKY_NOTE_WIDTH,
        height: STICKY_NOTE_HEIGHT,
        transform: `rotate(${note.rotationDeg}deg)`,
      }}
      onPointerDown={(event) => {
        if (isEditing) return;
        onDragStart(event, note);
      }}
      onDoubleClick={() => setIsEditing(true)}
    >
      <div
        className={`pointer-events-none absolute right-3 top-2 h-2.5 w-2.5 rounded-full shadow-sm ${pinClasses[note.color]}`}
      />

      <button
        type="button"
        aria-label="Delete note"
        className="absolute left-3 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-[10px] font-bold text-[#4f3f5a] hover:bg-white"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(note._id);
        }}
      >
        x
      </button>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="h-full w-full resize-none bg-transparent text-[13px] font-semibold leading-5 text-inherit outline-none placeholder:text-[#7f6d86]/80"
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
        <p className="max-h-full overflow-hidden whitespace-pre-wrap text-[14px] font-semibold leading-5">
          {note.text}
        </p>
      )}
    </div>
  );
}
