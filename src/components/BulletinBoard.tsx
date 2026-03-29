"use client";

import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../lib/api/client";
import { useSuite } from "../context/SuiteContext";
import { BulletinNote } from "../types";
import { SectionCard } from "./SectionCard";
import { STICKY_NOTE_HEIGHT, STICKY_NOTE_WIDTH, StickyNote } from "./StickyNote";

const NOTE_PADDING = 16;
const COLOR_OPTIONS: BulletinNote["color"][] = ["red", "green", "blue", "yellow"];
const DEFAULT_BOARD_WIDTH = 720;
const DEFAULT_BOARD_HEIGHT = 420;
const DRAG_SAVE_DELAY_MS = 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findOpenPosition(notes: BulletinNote[], width: number, height: number) {
  const maxX = Math.max(0, width - STICKY_NOTE_WIDTH);
  const maxY = Math.max(0, height - STICKY_NOTE_HEIGHT);
  const centerX = maxX / 2;
  const centerY = maxY / 2;
  const attempts: { x: number; y: number }[] = [];

  for (let radius = 0; radius <= 6; radius += 1) {
    const step = 38;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        attempts.push({
          x: clamp(centerX + dx * step, 0, maxX),
          y: clamp(centerY + dy * step, 0, maxY),
        });
      }
    }
  }

  attempts.push({ x: 0, y: 0 });

  for (const attempt of attempts) {
    const conflict = notes.some(
      (note) =>
        Math.abs(note.x - attempt.x) < STICKY_NOTE_WIDTH - NOTE_PADDING &&
        Math.abs(note.y - attempt.y) < STICKY_NOTE_HEIGHT - NOTE_PADDING
    );

    if (!conflict) {
      return attempt;
    }
  }

  return { x: centerX, y: centerY };
}

export function BulletinBoard() {
  const { suite } = useSuite();
  const { status } = useSession();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef(false);
  const notesRef = useRef<BulletinNote[]>([]);
  const saveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [notes, setNotes] = useState<BulletinNote[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    pointerOffsetX: number;
    pointerOffsetY: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    const element = boardRef.current;
    if (!element) return;

    const updateSize = () => {
      const bounds = element.getBoundingClientRect();
      setBoardSize({ width: bounds.width, height: bounds.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(saveTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const flushPendingNoteSave = async (noteId: string) => {
    const timeoutId = saveTimeoutsRef.current[noteId];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete saveTimeoutsRef.current[noteId];
    }

    const note = notesRef.current.find((currentNote) => currentNote._id === noteId);
    if (!note) return;

    try {
      await api.patch<BulletinNote>(`/bulletin-notes/${noteId}`, {
        x: note.x,
        y: note.y,
      });
      setError(null);
    } catch {
      // Keep the local position and let the next refresh retry from Mongo state.
    }
  };

  useEffect(() => {
    const handlePageHide = () => {
      Object.keys(saveTimeoutsRef.current).forEach((noteId) => {
        void flushPendingNoteSave(noteId);
      });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  const boardWidth = boardSize.width || DEFAULT_BOARD_WIDTH;
  const boardHeight = boardSize.height || DEFAULT_BOARD_HEIGHT;

  const scheduleNoteSave = (noteId: string, patch: Partial<BulletinNote>, delay = 0) => {
    const existingTimeout = saveTimeoutsRef.current[noteId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    saveTimeoutsRef.current[noteId] = setTimeout(async () => {
      try {
        await api.patch<BulletinNote>(`/bulletin-notes/${noteId}`, patch);
        setError(null);
      } catch {
        void loadNotes({ silent: true });
      } finally {
        delete saveTimeoutsRef.current[noteId];
      }
    }, delay);
  };

  const loadNotes = async (options?: { silent?: boolean }) => {
    if (!suite?._id || status !== "authenticated") {
      setNotes([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const loadedNotes = await api.get<BulletinNote[]>(`/bulletin-notes?suiteId=${suite._id}`);
      if (!interactionRef.current) {
        setNotes(loadedNotes);
      }
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load bulletin notes");
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadNotes();
  }, [suite?._id, status]);

  useEffect(() => {
    if (!dragState) return;
    interactionRef.current = true;

    const handlePointerMove = (event: PointerEvent) => {
      if (!boardRef.current) return;

      const bounds = boardRef.current.getBoundingClientRect();
      const nextX = clamp(event.clientX - bounds.left - dragState.pointerOffsetX, 0, Math.max(0, bounds.width - STICKY_NOTE_WIDTH));
      const nextY = clamp(event.clientY - bounds.top - dragState.pointerOffsetY, 0, Math.max(0, bounds.height - STICKY_NOTE_HEIGHT));

      setNotes((currentNotes) =>
        currentNotes.map((note) => (note._id === dragState.id ? { ...note, x: nextX, y: nextY } : note))
      );
    };

    const handlePointerUp = () => {
      const activeNote = notesRef.current.find((note) => note._id === dragState.id);
      setDragState(null);
      interactionRef.current = false;

      if (!activeNote) {
        return;
      }

      scheduleNoteSave(
        activeNote._id,
        {
          x: activeNote.x,
          y: activeNote.y,
        },
        DRAG_SAVE_DELAY_MS
      );
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  const createNote = async (color: BulletinNote["color"]) => {
    if (!suite?._id) return;

    const position = findOpenPosition(notes, boardWidth, boardHeight);
    const rotation = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.floor(Math.random() * 4));
    setMenuOpen(false);

    try {
      const createdNote = await api.post<BulletinNote>("/bulletin-notes", {
        suiteId: suite._id,
        color,
        text: "New note",
        x: position.x,
        y: position.y,
        rotationDeg: rotation,
      });
      setNotes((currentNotes) => [...currentNotes, createdNote]);
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create note");
    }
  };

  return (
    <SectionCard
      title="Bulletin Board"
      action={
        <div className="relative">
          <button
            type="button"
            aria-label="Add sticky note"
            className="button-secondary inline-flex h-10 w-10 items-center justify-center p-0"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Plus size={18} />
          </button>
          {menuOpen ? (
            <div className="absolute left-0 top-12 z-40 min-w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => createNote(color)}
                >
                  <span
                    className={`h-4 w-4 rounded-full ${
                      color === "red"
                        ? "bg-rose-400"
                        : color === "green"
                          ? "bg-emerald-400"
                          : color === "blue"
                            ? ""
                            : "bg-amber-400"
                    }`}
                    style={color === "blue" ? { backgroundColor: "#7dd3fc" } : undefined}
                  />
                  {color[0].toUpperCase() + color.slice(1)} note
                </button>
              ))}
            </div>
          ) : null}
        </div>
      }
    >
      <div
        ref={boardRef}
        className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-dashed border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(248,250,252,0.95))]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.24)_1px,transparent_1px)] bg-[size:26px_26px]" />
        {error ? (
          <div className="absolute left-4 right-4 top-4 z-40 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {notes.map((note) => (
          <StickyNote
            key={note._id}
            note={note}
            isDragging={dragState?.id === note._id}
            onDelete={async (id) => {
              const previousNotes = notes;
              setNotes((currentNotes) => currentNotes.filter((currentNote) => currentNote._id !== id));
              try {
                await api.delete<{ success: boolean }>(`/bulletin-notes/${id}`);
                setError(null);
              } catch (deleteError) {
                setNotes(previousNotes);
                setError(deleteError instanceof Error ? deleteError.message : "Failed to delete note");
              }
            }}
            onDragStart={(event, currentNote) => {
              interactionRef.current = true;
              const target = event.currentTarget.getBoundingClientRect();
              setDragState({
                id: currentNote._id,
                pointerOffsetX: event.clientX - target.left,
                pointerOffsetY: event.clientY - target.top,
                startX: currentNote.x,
                startY: currentNote.y,
              });
            }}
            onTextCommit={async (id, text) => {
              interactionRef.current = false;
              const previousNotes = notes;
              setNotes((currentNotes) =>
                currentNotes.map((currentNote) => (currentNote._id === id ? { ...currentNote, text } : currentNote))
              );
              try {
                await api.patch<BulletinNote>(`/bulletin-notes/${id}`, { text });
                setError(null);
              } catch (saveError) {
                setNotes(previousNotes);
                setError(saveError instanceof Error ? saveError.message : "Failed to save note");
              }
            }}
          />
        ))}
        {!loading && !notes.length ? (
          <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
            Add a sticky note to pin reminders, plans, or tiny asks for the suite.
          </div>
        ) : null}
        {loading ? (
          <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
            Loading shared notes...
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
