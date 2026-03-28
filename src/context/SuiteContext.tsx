"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

const STORAGE_KEY = "livewell-suite-id";

export function SuiteProvider({ children }: { children: ReactNode }) {
  const [suite, setSuite] = useState<Suite | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSuite = async (suiteId?: string) => {
    setLoading(true);
    try {
      const suites = await api.get<Suite[]>("/suites");
      const selectedId = suiteId || localStorage.getItem(STORAGE_KEY) || suites[0]?._id;

      if (!selectedId) {
        setSuite(null);
        setMembers([]);
        return;
      }

      let suiteData: Suite;
      try {
        suiteData = await api.get<Suite>(`/suites/${selectedId}`);
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);

        const fallbackId = suites[0]?._id;
        if (!fallbackId || fallbackId === selectedId) {
          setSuite(null);
          setMembers([]);
          return;
        }

        suiteData = await api.get<Suite>(`/suites/${fallbackId}`);
      }

      localStorage.setItem(STORAGE_KEY, suiteData._id);
      setSuite(suiteData);
      setMembers(suiteData.members || []);
    } finally {
      setLoading(false);
    }
  };

  const createSuite = async (name: string) => {
    const newSuite = await api.post<Suite>("/suites", { name });
    localStorage.setItem(STORAGE_KEY, newSuite._id);
    setSuite(newSuite);
    setMembers(newSuite.members || []);
    setLoading(false);
    return newSuite;
  };

  const joinSuite = async (inviteCode: string) => {
    const joinedSuite = await api.post<Suite>("/suites/join", { inviteCode });
    localStorage.setItem(STORAGE_KEY, joinedSuite._id);
    setSuite(joinedSuite);
    setMembers(joinedSuite.members || []);
    setLoading(false);
    return joinedSuite;
  };

  useEffect(() => {
    void refreshSuite();
  }, []);

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
