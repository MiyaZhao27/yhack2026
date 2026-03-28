"use client";

import { signIn, signOut, useSession } from "next-auth/react";

import { SectionCard } from "../../components/SectionCard";

export default function LoginPage() {
  const { data: session, status } = useSession();

  return (
    <div className="mx-auto max-w-2xl">
      <SectionCard
        title="Login"
        subtitle="Sign In"
      >
        <div className="space-y-4">
          {status === "loading" ? <p className="text-sm text-slate-500">Checking session...</p> : null}

          {session?.user ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Signed in as</p>
                <p className="mt-1 font-semibold text-slate-900">{session.user.name || "Google user"}</p>
                <p className="text-sm text-slate-600">{session.user.email}</p>
              </div>
              <button className="button-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Sign in with Google to start testing the OAuth flow.
              </p>
              <button className="button-primary" onClick={() => signIn("google", { callbackUrl: "/" })}>
                Continue with Google
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
