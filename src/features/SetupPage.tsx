"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { X } from "lucide-react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { formatCurrency } from "../lib/ui/format";
import { Balance, Member } from "../types";

function initials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "SU";
}

function isCurrentUserMember(member: Member, userId?: string, userEmail?: string | null) {
  if (userId && member._id === userId) return true;
  if (userEmail && member.email && member.email.toLowerCase() === userEmail.toLowerCase()) return true;
  return false;
}

export function SetupPage() {
  const { createSuite, joinSuite, suite, members } = useSuite();
  const { data: session } = useSession();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [name, setName] = useState(suite?.name || "New Suite");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outstandingDebt, setOutstandingDebt] = useState(0);
  const [loadingDebt, setLoadingDebt] = useState(false);

  useEffect(() => {
    if (suite?.name) {
      setName(suite.name);
    }
  }, [suite?.name]);

  useEffect(() => {
    if (!suite?._id || !session?.user?.id) {
      setOutstandingDebt(0);
      return;
    }

    setLoadingDebt(true);
    void api
      .get<{ balances: Balance[]; settleUps: Array<{ fromId?: string; toId?: string; amount: number }> }>(
        `/expenses/balances/${suite._id}`
      )
      .then((data) => {
        const mine = data.balances.find((balance) => balance.userId === session.user.id);
        setOutstandingDebt(Math.max(0, mine?.outstanding ?? 0));
      })
      .catch(() => setOutstandingDebt(0))
      .finally(() => setLoadingDebt(false));
  }, [suite?._id, session?.user?.id]);

  const suitemates = useMemo(
    () =>
      members.filter(
        (member) => !isCurrentUserMember(member, session?.user?.id, session?.user?.email)
      ),
    [members, session?.user?.email, session?.user?.id]
  );

  const blockedByDebt = outstandingDebt > 0.005;

  const handleCreateSuite = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (blockedByDebt) {
      setError(
        `You must settle your outstanding debt of ${formatCurrency(
          outstandingDebt
        )} before creating a new suite.`
      );
      return;
    }

    try {
      await createSuite(name);
      setShowCreateModal(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create suite");
    }
  };

  const handleJoinSuite = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (blockedByDebt) {
      setError(
        `You must settle your outstanding debt of ${formatCurrency(
          outstandingDebt
        )} before joining another suite.`
      );
      return;
    }

    try {
      await joinSuite(inviteCode);
      setShowJoinModal(false);
      setInviteCode("");
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to join suite");
    }
  };

  return (
    <>
      {showCreateModal ? (
        <div className="modal-shell" onClick={(event) => event.target === event.currentTarget && setShowCreateModal(false)}>
          <div className="modal-card max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#2a1738]">Create Suite</h2>
              <button className="button-ghost p-1" type="button" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="space-y-3" onSubmit={handleCreateSuite}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                  Suite Name
                </label>
                <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <button className="button-primary w-full" type="submit">
                Create Suite
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showJoinModal ? (
        <div className="modal-shell" onClick={(event) => event.target === event.currentTarget && setShowJoinModal(false)}>
          <div className="modal-card max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#2a1738]">Join Suite</h2>
              <button className="button-ghost p-1" type="button" onClick={() => setShowJoinModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="space-y-3" onSubmit={handleJoinSuite}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                  Suite Code
                </label>
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
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="People">
          {session?.user ? (
            <div className="surface-soft mb-3 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">You</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a1738] text-xs font-bold text-white">
                  {initials(session.user.name || "You")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2a1738]">{session.user.name || "You"}</p>
                  <p className="text-xs text-muted">{session.user.email || "No email"}</p>
                </div>
              </div>
            </div>
          ) : null}

          {suite ? (
            <>
              <div className="surface-tint rounded-2xl px-4 py-4">
                <p className="pill bg-[#ffd9e0] text-[#6b002e]">SuiteEase</p>
                <h3 className="mt-2 text-2xl font-bold text-[#2a1738]">{suite.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  Invite code: <span className="font-semibold text-[#6b002e]">{suite.inviteCode}</span>
                </p>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Suitemates</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suitemates.length ? (
                    suitemates.map((member) => (
                      <div key={member._id} className="surface-soft rounded-2xl px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6b002e] text-xs font-bold text-white">
                            {initials(member.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#2a1738]">{member.name}</p>
                            <p className="text-xs text-muted">Suitemate</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState label="No suitemates have joined yet." />
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState label="No suite yet. Create one or join with an invite code." />
          )}
        </SectionCard>

        <SectionCard title="Manage">
          {error ? (
            <div className="mb-3 rounded-2xl bg-[#ffe0ea] px-4 py-3 text-sm font-medium text-[#8f1d3a]">{error}</div>
          ) : null}

          {blockedByDebt ? (
            <div className="mb-3 rounded-2xl bg-[#ffe0ea] px-4 py-3 text-sm font-medium text-[#8f1d3a]">
              You must settle {formatCurrency(outstandingDebt)} before creating or joining another suite.
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="button-primary w-full"
              type="button"
              disabled={blockedByDebt || loadingDebt}
              onClick={() => {
                setError(null);
                setShowCreateModal(true);
              }}
            >
              Create Suite
            </button>
            <button
              className="button-secondary w-full"
              type="button"
              disabled={blockedByDebt || loadingDebt}
              onClick={() => {
                setError(null);
                setShowJoinModal(true);
              }}
            >
              Join Suite
            </button>
          </div>

          <div className="mt-5 border-t border-[rgba(108,73,118,0.2)] pt-4">
            <button className="button-secondary w-full" type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
