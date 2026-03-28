import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      suiteId?: string | null;
      onboardingComplete?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    suiteId?: string | null;
    onboardingComplete?: boolean;
    googleId?: string;
  }
}
