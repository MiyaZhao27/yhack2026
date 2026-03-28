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

interface SuiteContextValue {
  suite: Suite | null;
  members: Member[];
  loading: boolean;
  refreshSuite: (suiteId?: string) => Promise<void>;
  createSuite: (name: string, memberNames: string[]) => Promise<void>;
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

      const suiteData = await api.get<Suite>(`/suites/${selectedId}`);
      localStorage.setItem(STORAGE_KEY, suiteData._id);
      setSuite(suiteData);
      setMembers(suiteData.members || []);
    } finally {
      setLoading(false);
    }
  };

  const createSuite = async (name: string, memberNames: string[]) => {
    const newSuite = await api.post<Suite>("/suites", { name, members: memberNames });
    localStorage.setItem(STORAGE_KEY, newSuite._id);
    await refreshSuite(newSuite._id);
  };

  useEffect(() => {
    void refreshSuite();
  }, []);

  const value = useMemo(
    () => ({ suite, members, loading, refreshSuite, createSuite }),
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
