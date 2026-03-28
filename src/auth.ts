import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

import { connectDatabase } from "./server/config/db";
import { User } from "./server/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account?.providerAccountId) return false;

      await connectDatabase();

      await User.findOneAndUpdate(
        { googleId: account.providerAccountId },
        {
          $set: {
            name: user.name ?? "",
            email: user.email,
            image: user.image ?? null,
            googleId: account.providerAccountId,
          },
          $setOnInsert: {
            suiteId: null,
            onboardingComplete: false,
          },
        },
        { upsert: true, new: true }
      );

      return true;
    },
    async jwt({ token, account, user }) {
      await connectDatabase();

      const dbUser: any =
        user?.email
          ? await User.findOne({ email: user.email }).lean()
          : token.email
            ? await User.findOne({ email: token.email }).lean()
            : null;

      if (dbUser) {
        token.userId = String(dbUser._id);
        token.suiteId = dbUser.suiteId ? String(dbUser.suiteId) : null;
        token.onboardingComplete = dbUser.onboardingComplete;
      }

      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.suiteId = token.suiteId as string | null;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
      }
      return session;
    },
  },
};
