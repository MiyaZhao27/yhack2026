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
  const { suite, members, suites, activeSuiteId, setActiveSuite } = useSuite();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const showSuiteDetails = status === "authenticated" && !!session?.user;

  if (pathname === "/login" || pathname === "/onboarding") {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <header className="glass-card mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="pill bg-sky-100 text-sky-700">SuiteEase</div>
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
            <div className="grid gap-3 sm:grid-cols-[minmax(180px,220px)_repeat(4,minmax(0,1fr))]">
              <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active Suite</p>
                {suites.length ? (
                  <select
                    className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                    value={activeSuiteId ?? ""}
                    onChange={(event) => void setActiveSuite(event.target.value)}
                  >
                    {suites.map((suiteOption) => (
                      <option key={suiteOption._id} value={suiteOption._id}>
                        {suiteOption.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {suite?.name || "No suite selected"}
                  </p>
                )}
              </div>
              {members.slice(0, 4).map((member) => (
                <div key={member._id} className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Suitemate</p>
                  <p className="mt-1 text-sm font-semibold">{member.name}</p>
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
                ? "bg-slate-900 text-white shadow-card"
                : "bg-white/80 text-slate-700 hover:bg-white"
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
