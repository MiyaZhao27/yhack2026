"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

const fredoka = { className: "" };
const poppins = { className: "" };

const phrases = [
  "people take out their trash",
  "people pay you back",
  "everyone splits the bill",
  "chores actually get done",
  "no one forgets rent",
];

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (session?.user) {
      router.replace("/auth/redirect");
    }
  }, [session, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`min-h-screen ${poppins.className}`}
      style={{
        background: "linear-gradient(135deg, #fff7fe 0%, #f4e2ff 60%, #ffd9e0 100%)",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-center h-20 px-6">
        <span
          className={`text-3xl font-bold tracking-tight ${fredoka.className}`}
          style={{ color: "#6b002e" }}
        >
          SuiteEase
        </span>
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center justify-center px-6 pb-16 lg:flex-row lg:gap-20 lg:min-h-[calc(100vh-5rem)] lg:max-w-6xl lg:mx-auto lg:px-12">

        {/* Hero section */}
        <div className="flex-1 text-center lg:text-left mb-12 lg:mb-0 space-y-6 pt-8 lg:pt-0">
          <div className={`${fredoka.className}`}>
            <h1
              className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-snug"
              style={{ color: "#280e3f" }}
            >
              Loving is easy
            </h1>
            <h1
              className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-snug"
              style={{ color: "#6b002e" }}
            >
              when
            </h1>

            {/* Animated phrase */}
            <p
              className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-snug mt-1"
              style={{
                color: "#6b002e",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0px)" : "translateY(8px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}
            >
              {phrases[phraseIndex]}
            </p>
          </div>

          <p className="text-base lg:text-lg text-slate-500 max-w-sm mx-auto lg:mx-0 leading-relaxed">
            Manage your home with ease.
          </p>

          {/* Decorative dots */}
          <div className="flex gap-2 justify-center lg:justify-start pt-2">
            {phrases.map((_, i) => (
              <span
                key={i}
                className="block w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: i === phraseIndex ? "#6b002e" : "#dcbfc4",
                  transform: i === phraseIndex ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm lg:max-w-md">
          <div
            className="rounded-[2rem] p-8 relative overflow-hidden"
            style={{
              background: "rgba(255, 247, 254, 0.85)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 32px 64px rgba(107, 0, 46, 0.14), 0 0 0 1px rgba(220, 191, 196, 0.4)",
            }}
          >
            {/* Decorative blobs */}
            <div
              className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none"
              style={{ background: "#ffd9e0", opacity: 0.6 }}
            />
            <div
              className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full blur-2xl pointer-events-none"
              style={{ background: "#e8d5ff", opacity: 0.5 }}
            />

            <div className="relative z-10 space-y-8">
              {/* Card header */}
              <div className="space-y-1">
                <h2
                  className={`text-4xl font-bold ${fredoka.className}`}
                  style={{ color: "#280e3f" }}
                >
                  Google Auth
                </h2>
                <p className="text-sm tracking-wide" style={{ color: "#897175" }}>
                  so good to have you back home!
                </p>
              </div>

              {status === "loading" ? (
                <div className="flex items-center gap-3 text-sm" style={{ color: "#897175" }}>
                  <span
                    className="block w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "#dcbfc4", borderTopColor: "#6b002e" }}
                  />
                  Checking session...
                </div>
              ) : session?.user ? (
                <div className="space-y-4">
                  <div className="rounded-2xl p-4" style={{ background: "#f4e2ff" }}>
                    <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#897175" }}>
                      Signed in as
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{session.user.name || "User"}</p>
                    <p className="text-sm text-slate-500">{session.user.email}</p>
                  </div>
                  <button
                    onClick={() => router.push("/auth/redirect")}
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg active:scale-95 transition-transform ${fredoka.className}`}
                    style={{
                      background: "linear-gradient(135deg, #6b002e 0%, #8b1d44 100%)",
                      boxShadow: "0 8px 24px rgba(107, 0, 46, 0.22)",
                    }}
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition hover:opacity-80"
                    style={{ color: "#8c5000" }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => signIn("google", { callbackUrl: "/auth/redirect" })}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-slate-700 transition active:scale-95 hover:shadow-md"
                    style={{
                      background: "white",
                      boxShadow: "0 2px 12px rgba(107, 0, 46, 0.08)",
                      border: "1px solid #dcbfc4",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: "#e8d5d8" }} />
                    <span className="text-xs" style={{ color: "#b09aa0" }}>or</span>
                    <div className="flex-1 h-px" style={{ background: "#e8d5d8" }} />
                  </div>

                  <button
                    onClick={() => signIn("credentials", { type: "guest", callbackUrl: "/onboarding" })}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition active:scale-95 hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #f4e2ff 0%, #ffd9e0 100%)",
                      border: "1px solid #dcbfc4",
                      color: "#6b002e",
                    }}
                  >
                    Try as Guest
                  </button>

                  <p className="text-center text-xs" style={{ color: "#897175" }}>
                    By signing in you agree to our terms of service
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
