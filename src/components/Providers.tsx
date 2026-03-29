"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import { SuiteProvider } from "../context/SuiteContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SuiteProvider>{children}</SuiteProvider>
    </SessionProvider>
  );
}
