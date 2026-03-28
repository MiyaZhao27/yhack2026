import { Home, Receipt, ShoppingBasket, Sparkles, Wrench } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useSuite } from "../context/SuiteContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/tasks", label: "Tasks", icon: Wrench },
  { to: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { to: "/finance", label: "Finance", icon: Receipt },
  { to: "/setup", label: "Setup", icon: Sparkles },
];

export function AppLayout() {
  const { suite, members } = useSuite();

  return (
    <div className="app-shell">
      <header className="glass-card mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="pill bg-sky-100 text-sky-700">LiveWell</div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              {suite?.name || "Shared living, handled."}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Manage chores, shopping, and shared spending in one calm, demo-ready space.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {members.slice(0, 4).map((member) => (
              <div key={member._id} className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Suitemate</p>
                <p className="mt-1 text-sm font-semibold">{member.name}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-card"
                  : "bg-white/80 text-slate-700 hover:bg-white"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
