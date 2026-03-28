"use client";

import { ReactNode } from "react";
<<<<<<< HEAD
=======
import { SessionProvider } from "next-auth/react";
>>>>>>> origin/lauren/tasks

import { SuiteProvider } from "../context/SuiteContext";

export function Providers({ children }: { children: ReactNode }) {
<<<<<<< HEAD
  return <SuiteProvider>{children}</SuiteProvider>;
=======
  return (
    <SessionProvider>
      <SuiteProvider>{children}</SuiteProvider>
    </SessionProvider>
  );
>>>>>>> origin/lauren/tasks
}
