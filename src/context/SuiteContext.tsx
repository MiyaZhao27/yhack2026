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

<<<<<<< HEAD
=======
interface SuiteMemberInput {
  name: string;
  email?: string;
}

>>>>>>> origin/lauren/tasks
interface SuiteContextValue {
  suite: Suite | null;
  members: Member[];
  loading: boolean;
  refreshSuite: (suiteId?: string) => Promise<void>;
<<<<<<< HEAD
  createSuite: (name: string, memberNames: string[]) => Promise<void>;
=======
  createSuite: (name: string) => Promise<Suite>;
  joinSuite: (inviteCode: string) => Promise<Suite>;
>>>>>>> origin/lauren/tasks
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

<<<<<<< HEAD
      const suiteData = await api.get<Suite>(`/suites/${selectedId}`);
=======
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

>>>>>>> origin/lauren/tasks
      localStorage.setItem(STORAGE_KEY, suiteData._id);
      setSuite(suiteData);
      setMembers(suiteData.members || []);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const createSuite = async (name: string, memberNames: string[]) => {
    const newSuite = await api.post<Suite>("/suites", { name, members: memberNames });
    localStorage.setItem(STORAGE_KEY, newSuite._id);
    await refreshSuite(newSuite._id);
=======
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
>>>>>>> origin/lauren/tasks
  };

  useEffect(() => {
    void refreshSuite();
  }, []);

  const value = useMemo(
<<<<<<< HEAD
    () => ({ suite, members, loading, refreshSuite, createSuite }),
=======
    () => ({ suite, members, loading, refreshSuite, createSuite, joinSuite }),
>>>>>>> origin/lauren/tasks
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
