"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";

import { Home, Receipt, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSuite } from "../context/SuiteContext";
import { SuiteAgent } from "./SuiteAgent";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/tasks", label: "Tasks", icon: Wrench },
  { href: "/finance", label: "Finance", icon: Receipt },
  { href: "/setup", label: "Setup", icon: Sparkles },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { suite, members } = useSuite();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const showSuiteDetails = status === "authenticated" && !!session?.user;

  if (pathname === "/login" || pathname === "/onboarding") {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <header className="glass-card glass-nav mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-headline text-3xl font-bold tracking-tight text-[#8b1d44]">SuiteEase</div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              {showSuiteDetails ? suite?.name || "Shared living, handled." : "Shared living, handled."}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {showSuiteDetails
                ? "Manage chores, shared notes, and spending in one calm, demo-ready space."
                : "Sign in to view your suite, suitemates, chores, and shared planning tools."}
            </p>
          </div>
          {showSuiteDetails ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {members.slice(0, 4).map((member) => (
                <div key={member._id} className="editorial-shadow rounded-[24px] border border-white/70 bg-white/85 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#897175]">Suitemate</p>
                  <p className="mt-1 text-sm font-semibold text-[#280e3f]">{member.name}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              pathname === href
                ? "editorial-shadow bg-[#8b1d44] text-white"
                : "bg-white/85 text-[#564145] hover:bg-[#f4e2ff]"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {children}
      {showSuiteDetails && <SuiteAgent />}
    </div>
  );
}
