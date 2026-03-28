"use client";

import { FormEvent, useState } from "react";

import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";

const defaultNames = ["Edmund", "Alex", "Ryan", "Mia"];

export function SetupPage() {
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
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Suite Setup" subtitle="Spin up a new suite in under a minute">
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
      </SectionCard>

      <SectionCard title="Demo Mode" subtitle="Seeded to impress right after setup">
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            LiveWell is seeded with <span className="font-semibold text-slate-900">Maple 4B</span> and four members so
            the dashboard, chores, shopping, and balances all look alive right away.
          </p>
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
