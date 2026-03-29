"use client";

import { ReactNode, useState } from "react";
import { useSession } from "next-auth/react";
import { Home, Receipt, Sparkles, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  const isPublicFlow = pathname === "/login" || pathname === "/onboarding";
  const showSuiteDetails = status === "authenticated" && !!session?.user;
  const isDashboard = pathname === "/" || pathname === "/dashboard";

  if (isPublicFlow) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>

      <div className="floating-dock-wrap">
        <div className="floating-dock-row">
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

      {showSuiteDetails ? (
        <SuiteAgent open={agentOpen} onOpenChange={setAgentOpen} showLauncher={false} />
      ) : null}
    </div>
  );
}
