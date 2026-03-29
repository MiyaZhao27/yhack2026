"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSession } from "next-auth/react";

import { api } from "../lib/api/client";
import { Member, Suite } from "../types";

interface SuiteMemberInput {
  name: string;
  email?: string;
}

interface SuiteContextValue {
  suite: Suite | null;
  members: Member[];
  loading: boolean;
  refreshSuite: (suiteId?: string) => Promise<void>;
  createSuite: (name: string) => Promise<Suite>;
  joinSuite: (inviteCode: string) => Promise<Suite>;
}

const SuiteContext = createContext<SuiteContextValue | undefined>(undefined);

const STORAGE_KEY = "suiteease-suite-id";
const LEGACY_STORAGE_KEY = "livewell-suite-id";

export function SuiteProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const clearSuiteState = () => {
    setSuite(null);
    setMembers([]);
  };

  const refreshSuite = async (suiteId?: string) => {
    setLoading(true);
    try {
      const selectedId = suiteId || localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);

      if (!selectedId) {
        clearSuiteState();
        return;
      }

      try {
        const suiteData = await api.get<Suite>(`/suites/${selectedId}`);
        localStorage.setItem(STORAGE_KEY, suiteData._id);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        setSuite(suiteData);
        setMembers(suiteData.members || []);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        clearSuiteState();
      }
    } finally {
      setLoading(false);
    }
  };

  const createSuite = async (name: string) => {
    const newSuite = await api.post<Suite>("/suites", { name });
    localStorage.setItem(STORAGE_KEY, newSuite._id);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setSuite(newSuite);
    setMembers(newSuite.members || []);
    setLoading(false);
    return newSuite;
  };

  const joinSuite = async (inviteCode: string) => {
    const joinedSuite = await api.post<Suite>("/suites/join", { inviteCode });
    localStorage.setItem(STORAGE_KEY, joinedSuite._id);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    await refreshSuite(joinedSuite._id);
    return joinedSuite;
  };

  useEffect(() => {
    const sessionSuiteId = session?.user?.suiteId ?? undefined;
    void refreshSuite(sessionSuiteId);
  }, [session?.user?.suiteId]);

  const value = useMemo(
    () => ({ suite, members, loading, refreshSuite, createSuite, joinSuite }),
    [suite, members, loading]
  );

  return <SuiteContext.Provider value={value}>{children}</SuiteContext.Provider>;
}

export function useSuite() {
  const context = useContext(SuiteContext);
  if (!context) {
    throw new Error("useSuite must be used within SuiteProvider");
  }
  return context;
}
