"use client";

import {
  ChangeEvent,
  PointerEvent,
  RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";

import { api } from "../lib/api/client";
import { useSuite } from "../context/SuiteContext";
import { BulletinNote } from "../types";
import { getStickyNoteDimensions, StickyNote } from "./StickyNote";

const NOTE_PADDING = 20;
const COLOR_OPTIONS: BulletinNote["color"][] = ["yellow", "red", "green", "blue"];
const DRAG_SAVE_DELAY_MS = 900;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findOpenPosition(
  notes: BulletinNote[],
  boardWidth: number,
  boardHeight: number,
  nextWidth: number,
  nextHeight: number,
  preferredZone?: { x: number; y: number; width: number; height: number }
) {
  const minX = clamp(preferredZone?.x ?? 0, 0, Math.max(0, boardWidth - nextWidth));
  const minY = clamp(preferredZone?.y ?? 0, 0, Math.max(0, boardHeight - nextHeight));
  const maxX = clamp(
    preferredZone ? preferredZone.x + preferredZone.width - nextWidth : boardWidth - nextWidth,
    minX,
    Math.max(0, boardWidth - nextWidth)
  );
  const maxY = clamp(
    preferredZone ? preferredZone.y + preferredZone.height - nextHeight : boardHeight - nextHeight,
    minY,
    Math.max(0, boardHeight - nextHeight)
  );
  const centerX = minX + (maxX - minX) / 2;
  const centerY = minY + (maxY - minY) / 2;
  const attempts: { x: number; y: number }[] = [];

  for (let radius = 0; radius <= 12; radius += 1) {
    const step = 44;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        attempts.push({
          x: clamp(centerX + dx * step, minX, maxX),
          y: clamp(centerY + dy * step, minY, maxY),
        });
      }
    }
  }

  for (const attempt of attempts) {
    const conflict = notes.some((note) => {
      const { width, height } = getStickyNoteDimensions(note);
      return (
        Math.abs(note.x - attempt.x) < width - NOTE_PADDING &&
        Math.abs(note.y - attempt.y) < height - NOTE_PADDING
      );
    });

    if (!conflict) {
      return attempt;
    }
  }

  return { x: clamp(centerX, minX, maxX), y: clamp(centerY, minY, maxY) };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read file."));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function baseName(filename: string) {
  return filename.replace(/\.[^/.]+$/, "").trim() || "Pinned media";
}

export interface CorkboardNotesLayerHandle {
  createStickyNote: () => void;
  uploadPhotoOrGif: () => void;
}

interface CorkboardNotesLayerProps {
  boardWidth: number;
  boardHeight: number;
  boardCanvasRef: RefObject<HTMLDivElement | null>;
  defaultSpawnZone: { x: number; y: number; width: number; height: number };
  desktopBulletinViewport: { x: number; y: number; width: number; height: number };
  dragDisabled?: boolean;
  registerBulletinRef: (element: HTMLDivElement | null) => void;
}

export const CorkboardNotesLayer = forwardRef<CorkboardNotesLayerHandle, CorkboardNotesLayerProps>(
  function CorkboardNotesLayer(
    {
      boardWidth,
      boardHeight,
      boardCanvasRef,
      defaultSpawnZone,
      desktopBulletinViewport,
      dragDisabled = false,
      registerBulletinRef,
    },
    ref
  ) {
    const { suite } = useSuite();
    const { status } = useSession();

    const interactionRef = useRef(false);
    const notesRef = useRef<BulletinNote[]>([]);
    const uploadInputRef = useRef<HTMLInputElement | null>(null);
    const saveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const [notes, setNotes] = useState<BulletinNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{
      id: string;
      pointerId: number;
      pointerOffsetX: number;
      pointerOffsetY: number;
      noteWidth: number;
      noteHeight: number;
    } | null>(null);

    useEffect(() => {
      notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
      return () => {
        Object.values(saveTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      };
    }, []);

    const loadNotes = useCallback(
      async (options?: { silent?: boolean }) => {
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
          setError(loadError instanceof Error ? loadError.message : "Failed to load board notes.");
        } finally {
          if (!options?.silent) {
            setLoading(false);
          }
        }
      },
      [status, suite?._id]
    );

    const scheduleNoteSave = useCallback(
      (noteId: string, patch: Partial<BulletinNote>, delay = 0) => {
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
      },
      [loadNotes]
    );

    useEffect(() => {
      void loadNotes();
    }, [loadNotes]);

    useEffect(() => {
      if (!dragState) return;
      interactionRef.current = true;
      const previousUserSelect = document.body.style.userSelect;
      const previousCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      const handlePointerMove = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== dragState.pointerId) return;
        const boardBounds = boardCanvasRef.current?.getBoundingClientRect();
        if (!boardBounds) return;
        const scaleX = boardBounds.width > 0 ? boardBounds.width / boardWidth : 1;
        const scaleY = boardBounds.height > 0 ? boardBounds.height / boardHeight : 1;
        const pointerBoardX = (event.clientX - boardBounds.left) / scaleX;
        const pointerBoardY = (event.clientY - boardBounds.top) / scaleY;

        const nextX = clamp(
          pointerBoardX - dragState.pointerOffsetX,
          0,
          Math.max(0, boardWidth - dragState.noteWidth)
        );
        const nextY = clamp(
          pointerBoardY - dragState.pointerOffsetY,
          0,
          Math.max(0, boardHeight - dragState.noteHeight)
        );

        setNotes((currentNotes) =>
          currentNotes.map((note) => (note._id === dragState.id ? { ...note, x: nextX, y: nextY } : note))
        );
      };

      const handlePointerUp = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== dragState.pointerId) return;
        const activeNote = notesRef.current.find((note) => note._id === dragState.id);
        setDragState(null);
        interactionRef.current = false;

        if (!activeNote) return;

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
      window.addEventListener("pointercancel", handlePointerUp);

      return () => {
        document.body.style.userSelect = previousUserSelect;
        document.body.style.cursor = previousCursor;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };
    }, [boardCanvasRef, boardHeight, boardWidth, dragState, scheduleNoteSave]);

    const createTextNote = useCallback(async () => {
      if (!suite?._id) return;

      const { width, height } = getStickyNoteDimensions({ mediaUrl: null });
      const position = findOpenPosition(
        notesRef.current,
        boardWidth,
        boardHeight,
        width,
        height,
        defaultSpawnZone
      );
      const rotation = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.floor(Math.random() * 4));
      const color = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)] ?? "yellow";

      try {
        const createdNote = await api.post<BulletinNote>("/bulletin-notes", {
          suiteId: suite._id,
          color,
          text: "New note",
          mediaUrl: null,
          mediaMimeType: null,
          x: position.x,
          y: position.y,
          rotationDeg: rotation,
        });
        setNotes((currentNotes) => [...currentNotes, createdNote]);
        setError(null);
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Failed to create note.");
      }
    }, [boardHeight, boardWidth, defaultSpawnZone, suite?._id]);

    const openUploadPicker = useCallback(() => {
      uploadInputRef.current?.click();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        createStickyNote: () => {
          void createTextNote();
        },
        uploadPhotoOrGif: openUploadPicker,
      }),
      [createTextNote, openUploadPicker]
    );

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !suite?._id) return;

      event.target.value = "";

      if (!file.type.startsWith("image/")) {
        setError("Please upload an image or GIF file.");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setError("Please upload a file smaller than 8MB.");
        return;
      }

      try {
        const mediaUrl = await readFileAsDataUrl(file);
        const { width, height } = getStickyNoteDimensions({ mediaUrl });
        const position = findOpenPosition(
          notesRef.current,
          boardWidth,
          boardHeight,
          width,
          height,
          defaultSpawnZone
        );
        const rotation = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
        const color = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)] ?? "yellow";

        const createdNote = await api.post<BulletinNote>("/bulletin-notes", {
          suiteId: suite._id,
          color,
          text: baseName(file.name),
          mediaUrl,
          mediaMimeType: file.type,
          x: position.x,
          y: position.y,
          rotationDeg: rotation,
        });

        setNotes((currentNotes) => [...currentNotes, createdNote]);
        setError(null);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload media note.");
      }
    };

    return (
      <>
        <div className="board-notes-underlay">
          <div
            ref={registerBulletinRef}
            className="pointer-events-none absolute rounded-[1.4rem] border-2 border-dashed border-[#8b1d44]/55 bg-[rgba(255,255,255,0.1)]"
            style={{
              left: desktopBulletinViewport.x,
              top: desktopBulletinViewport.y,
              width: desktopBulletinViewport.width,
              height: desktopBulletinViewport.height,
            }}
          >
            <span className="absolute left-3 top-2 rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b1d44]">
              Desktop Bulletin Visible Area
            </span>
          </div>
        </div>

        <div className="board-notes-layer">
          {notes.map((note) => (
            <StickyNote
              key={note._id}
              note={note}
              isDragging={dragState?.id === note._id}
              onDelete={async (id) => {
                const previousNotes = notesRef.current;
                setNotes((currentNotes) => currentNotes.filter((currentNote) => currentNote._id !== id));
                try {
                  await api.delete<{ success: boolean }>(`/bulletin-notes/${id}`);
                  setError(null);
                } catch (deleteError) {
                  setNotes(previousNotes);
                  setError(deleteError instanceof Error ? deleteError.message : "Failed to delete note.");
                }
              }}
              onDragStart={(event: PointerEvent<HTMLDivElement>, currentNote) => {
                if (dragDisabled || event.button !== 0) return;
                const boardBounds = boardCanvasRef.current?.getBoundingClientRect();
                if (!boardBounds) return;
                const scaleX = boardBounds.width > 0 ? boardBounds.width / boardWidth : 1;
                const scaleY = boardBounds.height > 0 ? boardBounds.height / boardHeight : 1;
                const pointerBoardX = (event.clientX - boardBounds.left) / scaleX;
                const pointerBoardY = (event.clientY - boardBounds.top) / scaleY;
                const { width, height } = getStickyNoteDimensions(currentNote);
                setDragState({
                  id: currentNote._id,
                  pointerId: event.pointerId,
                  pointerOffsetX: pointerBoardX - currentNote.x,
                  pointerOffsetY: pointerBoardY - currentNote.y,
                  noteWidth: width,
                  noteHeight: height,
                });
              }}
              dragDisabled={dragDisabled}
              onTextCommit={async (id, text) => {
                interactionRef.current = false;
                const previousNotes = notesRef.current;
                setNotes((currentNotes) =>
                  currentNotes.map((currentNote) => (currentNote._id === id ? { ...currentNote, text } : currentNote))
                );
                try {
                  await api.patch<BulletinNote>(`/bulletin-notes/${id}`, { text });
                  setError(null);
                } catch (saveError) {
                  setNotes(previousNotes);
                  setError(saveError instanceof Error ? saveError.message : "Failed to save note.");
                }
              }}
            />
          ))}
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          className="hidden"
          accept="image/*,.gif"
          onChange={handleUpload}
        />

        {loading ? (
          <div className="pointer-events-none absolute right-6 top-6 rounded-lg bg-white/80 px-2 py-1 text-xs text-muted">
            Loading notes...
          </div>
        ) : null}
        {error ? (
          <div className="pointer-events-none absolute right-6 top-14 rounded-lg bg-[#ffe0ea] px-2 py-1 text-xs font-medium text-[#8f1d3a]">
            {error}
          </div>
        ) : null}
      </>
    );
  }
);
