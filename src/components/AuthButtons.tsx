"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function AuthButtons() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <button className="button-primary" onClick={() => signIn("google")}>
        Sign in with Google
      </button>
    );
  }

  return (
    <button className="button-secondary" onClick={() => signOut()}>
      Sign out
    </button>
  );
}
