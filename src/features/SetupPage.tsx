"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { X } from "lucide-react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { Member, Suite } from "../types";

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
  const { createSuite, joinSuite, suite, members, refreshSuite } = useSuite();
  const { data: session } = useSession();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [name, setName] = useState(suite?.name || "New Suite");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [memberSuites, setMemberSuites] = useState<Suite[]>([]);
  const [switchingSuiteId, setSwitchingSuiteId] = useState<string | null>(null);

  useEffect(() => {
    if (suite?.name) {
      setName(suite.name);
    }
  }, [suite?.name]);

  useEffect(() => {
    if (!session?.user?.id) {
      setMemberSuites([]);
      return;
    }

    void api
      .get<Suite[]>("/suites?mine=1")
      .then((data) => setMemberSuites(Array.isArray(data) ? data : []))
      .catch(() => setMemberSuites([]));
  }, [session?.user?.id, suite?._id]);

  const suitemates = useMemo(
    () =>
      members.filter(
        (member) => !isCurrentUserMember(member, session?.user?.id, session?.user?.email)
      ),
    [members, session?.user?.email, session?.user?.id]
  );

  const suitesForDisplay = useMemo(() => {
    const suiteMap = new Map<string, Suite>();
    for (const userSuite of memberSuites) {
      suiteMap.set(userSuite._id, userSuite);
    }

    if (suite?._id) {
      suiteMap.set(suite._id, {
        ...suite,
        members: suite.members?.length ? suite.members : members,
      });
    }

    return Array.from(suiteMap.values());
  }, [memberSuites, members, suite]);

  const handleCreateSuite = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

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

    try {
      await joinSuite(inviteCode);
      setShowJoinModal(false);
      setInviteCode("");
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to join suite");
    }
  };

  const handleSwitchSuite = async (suiteId: string) => {
    if (!suiteId || suiteId === suite?._id) return;
    setError(null);
    setSwitchingSuiteId(suiteId);
    try {
      await refreshSuite(suiteId);
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Failed to switch suite");
    } finally {
      setSwitchingSuiteId(null);
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

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="button-primary w-full"
              type="button"
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
              onClick={() => {
                setError(null);
                setShowJoinModal(true);
              }}
            >
              Join Suite
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your Suites</p>
            {suitesForDisplay.length ? (
              <div className="grid gap-2">
                {suitesForDisplay.map((membershipSuite) => {
                  const isCurrentSuite = suite?._id === membershipSuite._id;
                  return (
                    <div
                      key={membershipSuite._id}
                      className={`rounded-2xl border px-3 py-3 ${
                        isCurrentSuite
                          ? "surface-tint border-[#e6cfdd]"
                          : "surface-soft border-[rgba(108,73,118,0.15)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#2a1738]">{membershipSuite.name}</p>
                          <p className="text-xs text-muted">
                            Code: {membershipSuite.inviteCode || "Unavailable"}
                          </p>
                        </div>
                        <button
                          className={isCurrentSuite ? "button-secondary" : "button-primary"}
                          type="button"
                          disabled={isCurrentSuite || switchingSuiteId === membershipSuite._id}
                          onClick={() => void handleSwitchSuite(membershipSuite._id)}
                        >
                          {isCurrentSuite
                            ? "Active"
                            : switchingSuiteId === membershipSuite._id
                            ? "Switching..."
                            : "Switch"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState label="No suites yet." />
            )}
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
