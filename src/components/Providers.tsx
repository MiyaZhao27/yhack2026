"use client";

import { ReactNode } from "react";

import { SuiteProvider } from "../context/SuiteContext";

export function Providers({ children }: { children: ReactNode }) {
  return <SuiteProvider>{children}</SuiteProvider>;
}
