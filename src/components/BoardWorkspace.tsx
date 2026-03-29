"use client";

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Home, ImagePlus, Pin, Plus, Receipt, Scan, Sparkles, Users, Wrench } from "lucide-react";
import { useSession } from "next-auth/react";

import { CorkboardNotesLayer, CorkboardNotesLayerHandle } from "./CorkboardNotesLayer";
import { DashboardPage } from "../features/DashboardPage";
import { FinancePage } from "../features/FinancePage";
import { SetupPage } from "../features/SetupPage";
import { TasksPage } from "../features/TasksPage";

type BoardSectionId = "home" | "bulletin" | "tasks" | "finance" | "people";

const BOARD_WIDTH = 3000;
const BOARD_HEIGHT = 1850;
const DESKTOP_BULLETIN_VIEWPORT = { x: 0, y: 0, width: 720, height: 360 };
const BULLETIN_SPAWN_ZONE = {
  x: 120,
  y: 120,
  width: 560,
  height: 200,
};
const HOME_ZONE = { x: 810, y: 80, width: 460 };
const FINANCE_ZONE = { x: 1300, y: 80, width: 1440 };
const TASKS_ZONE = { x: 80, y: 820, width: 1520 };
const PEOPLE_ZONE = { x: 1840, y: 820, width: 1080 };

const sectionMeta: Array<{ id: BoardSectionId; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "bulletin", label: "Bulletin", icon: Pin },
  { id: "tasks", label: "Tasks", icon: Wrench },
  { id: "finance", label: "Finance", icon: Receipt },
  { id: "people", label: "People", icon: Users },
];

function sectionFromPath(pathname: string): BoardSectionId {
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/setup")) return "people";
  return "home";
}

interface BoardWorkspaceProps {
  pathname: string;
  showSuiteDetails: boolean;
  agentOpen: boolean;
  onToggleAgent: () => void;
}

export function BoardWorkspace({
  pathname,
  showSuiteDetails,
  agentOpen,
  onToggleAgent,
}: BoardWorkspaceProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const boardCanvasRef = useRef<HTMLDivElement | null>(null);
  const notesLayerRef = useRef<CorkboardNotesLayerHandle | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    pointerId: number;
  } | null>(null);
  const sectionRefs = useRef<Record<BoardSectionId, HTMLDivElement | null>>({
    home: null,
    bulletin: null,
    tasks: null,
    finance: null,
    people: null,
  });
  const initializedRef = useRef(false);

  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState<BoardSectionId>(() => sectionFromPath(pathname));
  const [isPanning, setIsPanning] = useState(false);
  const [isOverviewActive, setIsOverviewActive] = useState(false);
  const [overviewLayout, setOverviewLayout] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  const currentUser = useMemo(
    () => ({
      id: session?.user?.id,
      name: session?.user?.name,
      email: session?.user?.email,
      suiteId: session?.user?.suiteId,
    }),
    [session?.user?.email, session?.user?.id, session?.user?.name, session?.user?.suiteId]
  );

  const jumpTo = useCallback((id: BoardSectionId, smooth = true) => {
    const target = sectionRefs.current[id];
    if (!target) return;
    target.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "center",
      inline: "center",
    });
    setActiveSection(id);
  }, []);

  useEffect(() => {
    if (initializedRef.current) {
      jumpTo(sectionFromPath(pathname));
      return;
    }

    if (!viewportRef.current) return;
    initializedRef.current = true;

    const centerLeft = Math.max(0, (BOARD_WIDTH - viewportRef.current.clientWidth) / 2);
    const centerTop = Math.max(0, (BOARD_HEIGHT - viewportRef.current.clientHeight) / 2);

    viewportRef.current.scrollTo({ left: centerLeft, top: centerTop, behavior: "auto" });

    const initialSection = sectionFromPath(pathname);
    setActiveSection(initialSection);
    requestAnimationFrame(() => jumpTo(initialSection, false));
  }, [jumpTo, pathname]);

  useEffect(() => {
    if (!isOverviewActive || !viewportRef.current) return;

    const updateOverviewLayout = () => {
      if (!viewportRef.current) return;
      const viewportWidth = viewportRef.current.clientWidth;
      const viewportHeight = viewportRef.current.clientHeight;

      const horizontalPadding = 32;
      const topPadding = 12;
      const bottomSafeArea = 124;

      const availableWidth = Math.max(320, viewportWidth - horizontalPadding);
      const availableHeight = Math.max(220, viewportHeight - topPadding - bottomSafeArea);

      const scale = Math.min(
        availableWidth / BOARD_WIDTH,
        availableHeight / BOARD_HEIGHT,
        1
      );

      const boardWidthScaled = BOARD_WIDTH * scale;
      const boardHeightScaled = BOARD_HEIGHT * scale;
      const offsetX = Math.max(0, (viewportWidth - boardWidthScaled) / 2);
      const offsetY = Math.max(0, (availableHeight - boardHeightScaled) / 2) + topPadding;

      setOverviewLayout({ scale, offsetX, offsetY });
    };

    updateOverviewLayout();
    window.addEventListener("resize", updateOverviewLayout);
    return () => window.removeEventListener("resize", updateOverviewLayout);
  }, [isOverviewActive]);

  const navigateToSection = (id: BoardSectionId) => {
    if (isOverviewActive) {
      setIsOverviewActive(false);
      requestAnimationFrame(() => jumpTo(id, false));
      return;
    }
    jumpTo(id);
  };

  const toggleOverview = () => {
    if (!viewportRef.current) return;
    if (isOverviewActive) {
      setIsOverviewActive(false);
      requestAnimationFrame(() => jumpTo(activeSection, false));
      return;
    }
    setIsOverviewActive(true);
    viewportRef.current.scrollTo({ left: 0, top: 0, behavior: "auto" });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (isOverviewActive) return;
    if ((event.target as HTMLElement).closest(".board-widget")) return;
    if ((event.target as HTMLElement).closest(".board-note")) return;
    if ((event.target as HTMLElement).closest(".board-notes-control")) return;
    if (!viewportRef.current) return;

    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
      pointerId: event.pointerId,
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panRef.current || !viewportRef.current) return;
    const { startX, startY, scrollLeft, scrollTop, pointerId } = panRef.current;
    if (pointerId !== event.pointerId) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    viewportRef.current.scrollLeft = scrollLeft - deltaX;
    viewportRef.current.scrollTop = scrollTop - deltaY;
  };

  const endPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    if (panRef.current.pointerId !== event.pointerId) return;

    panRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className={`board-shell ${isOverviewActive ? "board-shell-overview" : ""}`}>
      <div
        ref={viewportRef}
        className={`board-viewport no-scrollbar ${isPanning ? "board-viewport-panning" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPanning}
        onPointerCancel={endPanning}
      >
        <div
          ref={boardCanvasRef}
          className="board-canvas"
          style={{
            width: `${BOARD_WIDTH}px`,
            height: `${BOARD_HEIGHT}px`,
            transform: isOverviewActive
              ? `translate(${overviewLayout.offsetX}px, ${overviewLayout.offsetY}px) scale(${overviewLayout.scale})`
              : undefined,
            transformOrigin: isOverviewActive ? "top left" : undefined,
          }}
        >
          <div
            ref={(element) => {
              sectionRefs.current.home = element;
            }}
            id="board-home"
            className="board-widget board-widget-panel"
            style={{ left: HOME_ZONE.x, top: HOME_ZONE.y, width: HOME_ZONE.width }}
          >
            <DashboardPage showBulletin={false} />
          </div>

          <div
            ref={(element) => {
              sectionRefs.current.tasks = element;
            }}
            id="board-tasks"
            className="board-widget board-widget-panel"
            style={{ left: TASKS_ZONE.x, top: TASKS_ZONE.y, width: TASKS_ZONE.width }}
          >
            <TasksPage currentUser={currentUser} />
          </div>

          <div
            ref={(element) => {
              sectionRefs.current.finance = element;
            }}
            id="board-finance"
            className="board-widget board-widget-panel"
            style={{ left: FINANCE_ZONE.x, top: FINANCE_ZONE.y, width: FINANCE_ZONE.width }}
          >
            <FinancePage />
          </div>

          <div
            ref={(element) => {
              sectionRefs.current.people = element;
            }}
            id="board-people"
            className="board-widget board-widget-panel"
            style={{ left: PEOPLE_ZONE.x, top: PEOPLE_ZONE.y, width: PEOPLE_ZONE.width }}
          >
            <SetupPage />
          </div>

          <CorkboardNotesLayer
            ref={notesLayerRef}
            boardWidth={BOARD_WIDTH}
            boardHeight={BOARD_HEIGHT}
            boardCanvasRef={boardCanvasRef}
            defaultSpawnZone={BULLETIN_SPAWN_ZONE}
            desktopBulletinViewport={DESKTOP_BULLETIN_VIEWPORT}
            registerBulletinRef={(element) => {
              sectionRefs.current.bulletin = element;
            }}
          />
        </div>
      </div>

      <div className="floating-dock-wrap">
        <div className="floating-dock-row board-dock-row">
          <button
            type="button"
            className="dock-brand hidden sm:flex"
            aria-label="SuiteEase"
            onClick={() => navigateToSection("home")}
          >
            <img src="/suiteease-logo.svg" alt="SuiteEase logo" className="h-8 w-8" />
          </button>

          {sectionMeta.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                className={active ? "dock-link-active" : "dock-link"}
                onClick={() => navigateToSection(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            className={isOverviewActive ? "dock-link-active" : "dock-link"}
            onClick={toggleOverview}
          >
            <Scan size={16} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            className="dock-link"
            onClick={() => notesLayerRef.current?.createStickyNote()}
          >
            <Plus size={16} />
            <span>Sticky Note</span>
          </button>

          <button
            type="button"
            className="dock-link"
            onClick={() => notesLayerRef.current?.uploadPhotoOrGif()}
          >
            <ImagePlus size={16} />
            <span>Image/GIF</span>
          </button>

          {showSuiteDetails ? (
            <button
              type="button"
              className="floating-chat-anchor"
              aria-label={agentOpen ? "Close suite assistant" : "Open suite assistant"}
              onClick={onToggleAgent}
            >
              <Sparkles size={17} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
