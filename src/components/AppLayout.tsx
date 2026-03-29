"use client";

import { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Home, Monitor, Receipt, Sparkles, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BoardWorkspace } from "./BoardWorkspace";
import { SuiteAgent } from "./SuiteAgent";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tasks", label: "Tasks", icon: Wrench },
  { href: "/finance", label: "Finance", icon: Receipt },
  { href: "/setup", label: "People", icon: Users },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [agentOpen, setAgentOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [uiMode, setUiMode] = useState<"serious" | "fun">("serious");

  const isPublicFlow = pathname === "/login" || pathname === "/onboarding";
  const showSuiteDetails = status === "authenticated" && !!session?.user;
  const isDashboard = pathname === "/" || pathname === "/dashboard";
  const funModeEnabled = process.env.NEXT_PUBLIC_EXPERIMENTAL_BOARD !== "false";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      const desktop = mediaQuery.matches;
      setIsDesktop(desktop);
      // Desktop mode is the default on every load.
      setUiMode("serious");
    };

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const setMode = (mode: "serious" | "fun") => {
    setUiMode(mode);
  };

  const showModeToggle =
    !isPublicFlow && showSuiteDetails && isDesktop && funModeEnabled;
  const useBoardMode = showModeToggle && uiMode === "fun";
  const modeToggleLabel = uiMode === "fun" ? "Corkboard Mode" : "Desktop Mode";
  const modeToggleActionLabel = uiMode === "fun" ? "Switch to Desktop Mode" : "Switch to Corkboard Mode";

  if (isPublicFlow) {
    return <>{children}</>;
  }

  if (useBoardMode) {
    return (
      <>
        <BoardWorkspace
          pathname={pathname}
          showSuiteDetails={showSuiteDetails}
          agentOpen={agentOpen}
          onToggleAgent={() => setAgentOpen((current) => !current)}
        />
        {showModeToggle ? (
          <button
            type="button"
            className="floating-mode-anchor"
            onClick={() => setMode(uiMode === "fun" ? "serious" : "fun")}
            aria-label={modeToggleActionLabel}
            title={modeToggleActionLabel}
          >
            <Monitor size={18} />
            <span>{modeToggleLabel}</span>
          </button>
        ) : null}
        {showSuiteDetails ? (
          <SuiteAgent open={agentOpen} onOpenChange={setAgentOpen} showLauncher={false} />
        ) : null}
      </>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>

      <div className="floating-dock-wrap">
        <div className="floating-dock-row">
          <Link href="/" className="dock-brand hidden sm:flex" aria-label="SuiteEase">
            <img src="/suiteease-logo.svg" alt="SuiteEase logo" className="h-8 w-8" />
          </Link>

          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? isDashboard : pathname === href;
            return (
              <Link key={href} href={href} className={active ? "dock-link-active" : "dock-link"}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}

          {showSuiteDetails ? (
            <button
              type="button"
              className="floating-chat-anchor"
              aria-label={agentOpen ? "Close suite assistant" : "Open suite assistant"}
              onClick={() => setAgentOpen((current) => !current)}
            >
              <Sparkles size={17} />
            </button>
          ) : null}
        </div>
      </div>

      {showModeToggle ? (
        <button
          type="button"
          className="floating-mode-anchor"
          onClick={() => setMode(uiMode === "fun" ? "serious" : "fun")}
          aria-label={modeToggleActionLabel}
          title={modeToggleActionLabel}
        >
          <Monitor size={18} />
          <span>{modeToggleLabel}</span>
        </button>
      ) : null}

      {showSuiteDetails ? (
        <SuiteAgent open={agentOpen} onOpenChange={setAgentOpen} showLauncher={false} />
      ) : null}
    </div>
  );
}
