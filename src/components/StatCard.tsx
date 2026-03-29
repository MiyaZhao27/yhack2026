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
    sky: "bg-[#d9e2ff] text-[#0c306e]",
    mint: "bg-[#c8f3de] text-[#00503a]",
    gold: "bg-[#ffdcbf] text-[#7a4300]",
    coral: "bg-[#ffd4dc] text-[#8f1d3a]",
  }[tone];

  return (
    <div className="section-card interactive-lift">
      <div className={`pill ${toneClass}`}>{icon || title}</div>
      <p className="mt-4 text-sm text-muted">{title}</p>
      <p className="mt-1 text-3xl font-bold text-[#2a1738]">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}
