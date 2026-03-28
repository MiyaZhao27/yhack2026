import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      suiteId?: string | null;
      onboardingComplete?: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
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
