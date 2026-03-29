"use client";

import { useState } from "react";

import { Fredoka, Poppins } from "next/font/google";
import { useRouter } from "next/navigation";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

function Icon({ name, filled = false, size = 24, color }: { name: string; filled?: boolean; size?: number; color?: string }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        color,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1,
      }}
    >
      {name}
    </span>
  );
}

function Dots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: i === active ? 24 : 8, background: i === active ? "#6b002e" : "#dcbfc4" }}
        />
      ))}
    </div>
  );
}

function GhostNav() {
  const items = [
    { icon: "home", label: "Home" },
    { icon: "checklist", label: "Chores" },
    { icon: "add_circle", label: "Add" },
    { icon: "shopping_cart", label: "Shopping" },
    { icon: "payments", label: "Finances" },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-20"
      style={{
        background: "rgba(255,247,254,0.7)",
        backdropFilter: "blur(16px)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 24px rgba(40,14,63,0.06)",
        opacity: 0.4,
        pointerEvents: "none",
      }}
    >
      {items.map(({ icon, label }) => (
        <div key={icon} className="flex flex-col items-center justify-center gap-0.5" style={{ color: "#280e3f" }}>
          <Icon name={icon} size={24} />
          <span className={`text-[10px] font-medium ${poppins.className}`}>{label}</span>
        </div>
      ))}
    </nav>
  );
}

function CTAButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 rounded-[10px] text-white font-bold text-lg active:scale-95 transition-all shadow-lg ${fredoka.className}`}
      style={{ background: "linear-gradient(135deg, #6b002e 0%, #8b1d44 100%)" }}
    >
      {label}
    </button>
  );
}

// ── Slide 1: Finances ─────────────────────────────────────────────────────────
function FinancesSlide({ onNext }: { onNext: () => void }) {
  return (
    <main className={`flex-grow flex flex-col items-center justify-center px-8 pt-20 pb-24 max-w-2xl mx-auto w-full ${poppins.className}`}>
      {/* Heading */}
      <section className="w-full text-center mb-10">
        <h1 className={`text-[2.75rem] leading-[1.1] font-bold tracking-tight mb-4 ${fredoka.className}`} style={{ color: "#280e3f" }}>
          Split it once,{" "}
          <br />
          <span style={{ background: "linear-gradient(90deg, #6b002e, #8b1d44)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            forget about it.
          </span>
        </h1>
        <p className="text-base leading-relaxed max-w-xs mx-auto" style={{ color: "#564145" }}>
          Manage shared expenses and balances without the awkward conversations.
        </p>
      </section>

      {/* Visual */}
      <section className="relative w-full aspect-square max-w-sm mb-12">
        {/* Rotated background blob */}
        <div
          className="absolute inset-0 rounded-[40px]"
          style={{ background: "#fcf0ff", transform: "rotate(6deg) scale(0.95)" }}
        />
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Main card */}
          <div
            className="relative z-20 flex flex-col items-center justify-center overflow-hidden"
            style={{
              width: "80%",
              aspectRatio: "4/5",
              background: "#ffffff",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 8px 24px rgba(40,14,63,0.06)",
            }}
          >
            {/* Illustration placeholder */}
            <div
              className="w-48 h-48 mb-4 flex items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #ffd9e0 0%, #f4e2ff 100%)" }}
            >
              <div className="flex flex-col items-center gap-2">
                <span style={{ fontSize: 56 }}>🧾</span>
                <span style={{ fontSize: 28 }}>✂️</span>
              </div>
            </div>
            <span className={`text-lg font-bold ${fredoka.className}`} style={{ color: "#6b002e" }}>
              Rent &amp; Utilities
            </span>
            <div className="flex gap-2 mt-2">
              <div className="w-6 h-6 rounded-full" style={{ background: "#ffdcbf" }} />
              <div className="w-6 h-6 rounded-full" style={{ background: "#d9e2ff" }} />
              <div className="w-6 h-6 rounded-full" style={{ background: "#ffd9e0" }} />
            </div>
          </div>

          {/* Chip 1: payment amount */}
          <div
            className="absolute z-30 flex items-center gap-2 px-4 py-3 rounded-[15px]"
            style={{
              top: -16,
              right: -16,
              background: "#fc9923",
              color: "#663800",
              boxShadow: "0 8px 24px rgba(40,14,63,0.06)",
            }}
          >
            <Icon name="payments" filled size={16} color="#663800" />
            <span className={`text-xs font-bold tracking-wide ${poppins.className}`}>-$42.50</span>
          </div>

          {/* Chip 2: grocery split */}
          <div
            className="absolute z-30 flex items-center gap-2 px-4 py-3 rounded-[15px]"
            style={{
              bottom: 48,
              left: -16,
              background: "#8b1d44",
              color: "#ff9db4",
              boxShadow: "0 8px 24px rgba(40,14,63,0.06)",
            }}
          >
            <Icon name="checklist" size={16} color="#ff9db4" />
            <span className={`text-xs font-bold tracking-wide ${poppins.className}`}>Grocery split</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="w-full space-y-4">
        <CTAButton label="Get Started" onClick={onNext} />
        <Dots total={3} active={0} />
      </section>
    </main>
  );
}

// ── Slide 2: Shopping ─────────────────────────────────────────────────────────
function ShoppingSlide({ onNext }: { onNext: () => void }) {
  return (
    <main className={`flex-grow flex flex-col items-center justify-center px-8 pt-20 pb-24 text-center max-w-lg mx-auto overflow-hidden w-full ${poppins.className}`}>
      {/* Hero illustration */}
      <div className="relative w-full mb-16">
        <div
          className="absolute rounded-full blur-3xl"
          style={{ top: -40, right: -40, width: 256, height: 256, background: "#fc9923", opacity: 0.1 }}
        />
        <div className="relative z-10 flex flex-col items-center">
          {/* Rotated image card */}
          <div
            className="w-full overflow-hidden flex items-center justify-center p-8"
            style={{
              maxHeight: 320,
              aspectRatio: "1/1",
              background: "#fcf0ff",
              borderRadius: 40,
              transform: "rotate(3deg)",
            }}
          >
            <div
              className="w-full h-full rounded-[20px] flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)",
                border: "4px solid #ffffff",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                transform: "rotate(-3deg)",
                overflow: "hidden",
              }}
            >
              <div className="grid grid-cols-4 gap-2 p-4 opacity-80">
                {["🥦", "🍎", "🥕", "🍋", "🥬", "🍇", "🧅", "🍊", "🥑", "🍅", "🌽", "🫐"].map((e, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating receipt badge */}
          <div
            className="absolute flex items-center gap-3 p-4 rounded-xl"
            style={{
              bottom: -24,
              left: -16,
              background: "#ffffff",
              boxShadow: "0 8px 24px rgba(40,14,63,0.08)",
              border: "1px solid rgba(220,191,196,0.1)",
              transform: "rotate(-2deg)",
              minWidth: 200,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#ffd9e0" }}
            >
              <Icon name="receipt_long" color="#6b002e" />
            </div>
            <div className="text-left">
              <p className={`text-[10px] uppercase tracking-wider font-bold ${poppins.className}`} style={{ color: "#8c5000" }}>
                Receipt Scanned
              </p>
              <p className={`text-sm font-semibold ${poppins.className}`} style={{ color: "#280e3f" }}>
                $42.50 split 3 ways
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="space-y-6">
        <h1 className={`text-4xl font-bold leading-tight tracking-tight ${fredoka.className}`} style={{ color: "#280e3f" }}>
          Shop for the suite,{" "}
          <br />
          <span className="italic" style={{ color: "#6b002e" }}>
            not just for you.
          </span>
        </h1>
        <p className="leading-relaxed text-sm md:text-base" style={{ color: "#564145" }}>
          Keep the pantry stocked without the stress. Collaborate on{" "}
          <strong style={{ color: "#280e3f" }}>shared shopping lists</strong> and split bills instantly with{" "}
          <strong style={{ color: "#280e3f" }}>smart receipt scanning</strong>.
        </p>
      </div>

      {/* Actions */}
      <div className="w-full mt-12 space-y-6">
        <Dots total={3} active={1} />
        <CTAButton label="Next" onClick={onNext} />
      </div>
    </main>
  );
}

// ── Slide 3: Chores ───────────────────────────────────────────────────────────
function ChoresSlide({ onNext }: { onNext: () => void }) {
  return (
    <main className={`min-h-screen flex flex-col pt-16 pb-24 px-6 md:max-w-4xl md:mx-auto w-full ${poppins.className}`}>
      <section className="mt-8 flex flex-col gap-8">
        {/* Heading */}
        <div className="relative">
          <div
            className="absolute rounded-full blur-2xl"
            style={{ top: -16, left: -16, width: 96, height: 96, background: "rgba(252,153,35,0.2)" }}
          />
          <h1 className={`text-[3.5rem] leading-[1.1] font-bold tracking-tight ${fredoka.className}`} style={{ color: "#280e3f" }}>
            Living better,{" "}
            <br />
            <span style={{ color: "#8b1d44" }}>together.</span>
          </h1>
        </div>

        <p className="text-lg max-w-xs" style={{ color: "#564145" }}>
          Managing chores made simple. Transform your shared space into a sanctuary.
        </p>

        {/* Bento grid */}
        <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(6, 1fr)", gridTemplateRows: "repeat(2, 1fr)", height: 320 }}>
          {/* Large image card */}
          <div
            className="overflow-hidden group"
            style={{
              gridColumn: "span 4",
              gridRow: "span 2",
              background: "linear-gradient(135deg, #b2d8d8 0%, #8bbcbc 100%)",
              borderRadius: 20,
              boxShadow: "0 8px 24px rgba(40,14,63,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 80,
            }}
          >
            🏠
          </div>

          {/* Accent card 1: sparkles */}
          <div
            className="flex items-center justify-center relative overflow-hidden"
            style={{ gridColumn: "span 2", gridRow: "span 1", background: "#ffd9e0", borderRadius: 20 }}
          >
            <Icon name="auto_awesome" filled size={40} color="#6b002e" />
            <div
              className="absolute bottom-2 right-2 rounded-full blur-lg"
              style={{ width: 32, height: 32, background: "rgba(255,255,255,0.3)" }}
            />
          </div>

          {/* Accent card 2: checklist */}
          <div
            className="flex items-center justify-center p-4 overflow-hidden"
            style={{ gridColumn: "span 2", gridRow: "span 1", background: "#d9e2ff", borderRadius: 20 }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ border: "2px dashed rgba(12,48,110,0.2)", borderRadius: 12 }}
            >
              <Icon name="checklist" size={36} color="#0c306e" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature card + CTA */}
      <section className="mt-12 space-y-6">
        <div
          className="flex items-center gap-4 p-5 rounded-[20px]"
          style={{
            background: "#ffffff",
            boxShadow: "0 8px 24px rgba(40,14,63,0.06)",
            border: "1px solid rgba(220,191,196,0.1)",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#fc9923" }}
          >
            <Icon name="group" filled size={24} color="#663800" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${fredoka.className}`} style={{ color: "#280e3f" }}>
              Shared Harmony
            </h3>
            <p className="text-sm" style={{ color: "#564145" }}>
              Automate rotations and split tasks fairly.
            </p>
          </div>
        </div>

        <Dots total={3} active={2} />
      </section>

      <div className="mt-auto pt-6 flex flex-col gap-4">
        <CTAButton label="Next" onClick={onNext} />
      </div>
    </main>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  async function finish() {
    await fetch("/api/user/complete-onboarding", { method: "POST" });
    router.push("/");
  }

  function advance() {
    if (current < 2) setCurrent(current + 1);
    else finish();
  }

  return (
    <div className={`min-h-screen flex flex-col ${poppins.className}`} style={{ background: "#fff7fe" }}>
      {/* Fixed header */}
      <header
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16"
        style={{ background: "rgba(255,247,254,0.7)", backdropFilter: "blur(16px)" }}
      >
        <span className={`text-xl font-bold ${fredoka.className}`} style={{ color: "#8b1d44" }}>
          SuiteEase
        </span>
        <div className="flex items-center gap-4">
          {current === 0 ? (
            <>
              <Icon name="search" color="#8b1d44" />
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#8b1d44" }}
              >
                U
              </div>
            </>
          ) : (
            <button
              onClick={finish}
              className={`text-sm font-semibold ${poppins.className}`}
              style={{ color: current === 2 ? "#8c5000" : "#564145" }}
            >
              Skip
            </button>
          )}
        </div>
      </header>

      {/* Slides */}
      {current === 0 && <FinancesSlide onNext={advance} />}
      {current === 1 && <ShoppingSlide onNext={advance} />}
      {current === 2 && <ChoresSlide onNext={finish} />}

      <GhostNav />
    </div>
  );
}
