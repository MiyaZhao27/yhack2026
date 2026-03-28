import { ReactNode } from "react";

export function StatCard({
  title,
  value,
  hint,
  tone = "sky",
  icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  tone?: "sky" | "mint" | "gold" | "coral";
  icon?: ReactNode;
}) {
  const toneClass = {
    sky: "bg-sky-100 text-sky-800",
    mint: "bg-emerald-100 text-emerald-800",
    gold: "bg-amber-100 text-amber-800",
    coral: "bg-rose-100 text-rose-800",
  }[tone];

  return (
    <div className="glass-card">
      <div className={`pill ${toneClass}`}>{icon || title}</div>
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}
