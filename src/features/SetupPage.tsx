"use client";

import { FormEvent, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";


export function SetupPage() {
  const { createSuite, joinSuite, suite } = useSuite();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(suite?.name || "Maple 4B");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(suite?.inviteCode || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (suite?.inviteCode) {
      setCreatedCode(suite.inviteCode);
    }
  }, [suite?.inviteCode]);

  const handleCreateSuite = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const createdSuite = await createSuite(name);
      setCreatedCode(createdSuite.inviteCode || null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create suite");
    }
  };

  const handleJoinSuite = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await joinSuite(inviteCode);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to join suite");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Suite Setup" subtitle="Spin up a new suite in under a minute">
        <div className="mb-4 flex gap-2">
          <button
            className={mode === "create" ? "button-primary" : "button-secondary"}
            type="button"
            onClick={() => setMode("create")}
          >
            Create Suite
          </button>
          <button
            className={mode === "join" ? "button-primary" : "button-secondary"}
            type="button"
            onClick={() => setMode("join")}
          >
            Join by Code
          </button>
        </div>

        {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

        {mode === "create" ? (
          <form className="space-y-4" onSubmit={handleCreateSuite}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Suite name</label>
              <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Create your suite first, then share the generated code so other people can join it.
            </div>
            {createdCode ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                Invite code for this suite: <span className="font-semibold">{createdCode}</span>
                <p className="mt-2 text-emerald-800">This code stays valid until you change or delete the suite.</p>
              </div>
            ) : null}
            <button className="button-primary w-full" type="submit">
              Create Suite
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleJoinSuite}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Suite code</label>
              <input
                className="input uppercase"
                required
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              />
            </div>
            <button className="button-primary w-full" type="submit">
              Join Suite
            </button>
          </form>
        )}
      </SectionCard>

      <SectionCard title="How it works" subtitle="Get your suite up and running">
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            Create a suite to get an invite code, then share it with your roommates so they can join.
          </p>
          <p>
            Once everyone has joined, you can start tracking chores, shopping, and shared expenses together.
          </p>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6">
          <button
            className="button-secondary w-full"
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
