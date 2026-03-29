export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(108,73,118,0.32)] bg-white/55 px-4 py-5 text-center text-sm text-muted">
      {label}
    </div>
  );
}
