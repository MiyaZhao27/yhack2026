"use client";

<<<<<<< HEAD
import { FormEvent, useState } from "react";
=======
import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
>>>>>>> origin/lauren/tasks

import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";

const defaultNames = ["Edmund", "Alex", "Ryan", "Mia"];

export function SetupPage() {
<<<<<<< HEAD
  const { createSuite, suite, members } = useSuite();
  const [name, setName] = useState(suite?.name || "Maple 4B");
  const [memberNames, setMemberNames] = useState(
    members.length ? members.map((member) => member.name) : defaultNames
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createSuite(name, memberNames.filter(Boolean));
  };

  const updateMember = (index: number, value: string) => {
    setMemberNames((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
=======
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
>>>>>>> origin/lauren/tasks
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Suite Setup" subtitle="Spin up a new suite in under a minute">
<<<<<<< HEAD
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Suite name</label>
            <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Suitemates</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {memberNames.map((member, index) => (
                <input
                  key={index}
                  className="input"
                  required
                  value={member}
                  onChange={(event) => updateMember(index, event.target.value)}
                />
              ))}
            </div>
          </div>
          <button className="button-primary w-full" type="submit">
            Save Suite
          </button>
        </form>
=======
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
>>>>>>> origin/lauren/tasks
      </SectionCard>

      <SectionCard title="Demo Mode" subtitle="Seeded to impress right after setup">
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            LiveWell is seeded with <span className="font-semibold text-slate-900">Maple 4B</span> and four members so
            the dashboard, chores, shopping, and balances all look alive right away.
          </p>
<<<<<<< HEAD
=======
          <p>
            Re-run <code>npm run seed</code> anytime to restore demo data and generate a fresh invite code for the
            seeded suite.
          </p>
>>>>>>> origin/lauren/tasks
          <div className="rounded-2xl bg-slate-900 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Included members</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {defaultNames.map((person) => (
                <span key={person} className="pill bg-white/10 text-white">
                  {person}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
