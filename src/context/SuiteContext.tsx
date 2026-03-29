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
interface SuiteDirectoryResponse {
  suites: Suite[];
  activeSuiteId: string | null;
}

interface SuiteContextValue {
  suites: Suite[];
  activeSuiteId: string | null;
  activeSuite: Suite | null;
  suite: Suite | null;
  members: Member[];
  loading: boolean;
  setActiveSuite: (suiteId: string) => Promise<void>;
  refreshSuites: () => Promise<void>;
  refreshSuite: (suiteId?: string) => Promise<void>;
  createSuite: (name: string) => Promise<Suite>;
  joinSuite: (inviteCode: string) => Promise<Suite>;
}

const SuiteContext = createContext<SuiteContextValue | undefined>(undefined);

const STORAGE_KEY = "livewell-suite-id";

export function SuiteProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [suites, setSuites] = useState<Suite[]>([]);
  const [activeSuiteId, setActiveSuiteIdState] = useState<string | null>(null);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const clearSuiteState = () => {
    setSuites([]);
    setActiveSuiteIdState(null);
    setSuite(null);
    setMembers([]);
  };

  const loadSuites = async () => {
    const directory = await api.get<SuiteDirectoryResponse>("/suites");
    setSuites(directory.suites);
    setActiveSuiteIdState(directory.activeSuiteId);
    return directory;
  };

  const refreshSuite = async (suiteId?: string) => {
    setLoading(true);
    try {
      const directory = await loadSuites();
      const selectedId = directory.activeSuiteId || suiteId || localStorage.getItem(STORAGE_KEY);

      if (!selectedId) {
        clearSuiteState();
        return;
      }

      try {
        const suiteData = await api.get<Suite>(`/suites/${selectedId}`);
        localStorage.setItem(STORAGE_KEY, suiteData._id);
        setActiveSuiteIdState(suiteData._id);
        setSuite(suiteData);
        setMembers(suiteData.members || []);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        const fallbackSuiteId = directory.activeSuiteId;
        if (fallbackSuiteId && fallbackSuiteId !== selectedId) {
          const fallbackSuite = await api.get<Suite>(`/suites/${fallbackSuiteId}`);
          localStorage.setItem(STORAGE_KEY, fallbackSuite._id);
          setActiveSuiteIdState(fallbackSuite._id);
          setSuite(fallbackSuite);
          setMembers(fallbackSuite.members || []);
        } else {
          clearSuiteState();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const createSuite = async (name: string) => {
    const newSuite = await api.post<Suite>("/suites", { name });
    localStorage.setItem(STORAGE_KEY, newSuite._id);
    setSuites((currentSuites) => {
      const filtered = currentSuites.filter((currentSuite) => currentSuite._id !== newSuite._id);
      return [...filtered, newSuite];
    });
    setActiveSuiteIdState(newSuite._id);
    setSuite(newSuite);
    setMembers(newSuite.members || []);
    setLoading(false);
    return newSuite;
  };

  const joinSuite = async (inviteCode: string) => {
    const joinedSuite = await api.post<Suite>("/suites/join", { inviteCode });
    localStorage.setItem(STORAGE_KEY, joinedSuite._id);
    await refreshSuite(joinedSuite._id);
    return joinedSuite;
  };

  const setActiveSuite = async (suiteId: string) => {
    if (!suiteId) return;
    await api.patch<{ activeSuiteId: string | null }>("/suites", { suiteId });
    localStorage.setItem(STORAGE_KEY, suiteId);
    await refreshSuite(suiteId);
  };

  const refreshSuites = async () => {
    await refreshSuite(activeSuiteId || undefined);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      clearSuiteState();
      setLoading(false);
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    const sessionSuiteId =
      session?.user?.activeSuiteId ?? session?.user?.suiteId ?? localStorage.getItem(STORAGE_KEY) ?? undefined;
    void refreshSuite(sessionSuiteId);
  }, [session?.user?.activeSuiteId, session?.user?.suiteId, status]);

  const value = useMemo(
    () => ({
      suites,
      activeSuiteId,
      activeSuite: suite,
      suite,
      members,
      loading,
      setActiveSuite,
      refreshSuites,
      refreshSuite,
      createSuite,
      joinSuite,
    }),
    [suites, activeSuiteId, suite, members, loading]
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
