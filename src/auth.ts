import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

import { connectDatabase } from "./server/config/db";
import { User } from "./server/models/User";
import { GOOGLE_TASKS_SCOPE } from "./server/services/googleTasksService";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            GOOGLE_TASKS_SCOPE,
          ].join(" "),
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

      const updatePayload: Record<string, unknown> = {
        name: user.name ?? "",
        email: user.email,
        image: user.image ?? null,
        googleId: account.providerAccountId,
      };

      if (account.access_token) {
        updatePayload.googleAccessToken = account.access_token;
      }

      if (account.refresh_token) {
        updatePayload.googleRefreshToken = account.refresh_token;
      }

      if (account.expires_at) {
        updatePayload.googleTokenExpiresAt = new Date(account.expires_at * 1000);
      }

      const existingUser =
        (await User.findOne({ googleId: account.providerAccountId })) ||
        (await User.findOne({ email: user.email.toLowerCase() }));

      const dbUser = existingUser
        ? existingUser
        : await User.create({
            ...updatePayload,
            email: user.email.toLowerCase(),
            suiteId: null,
            onboardingComplete: false,
          });

      if (existingUser) {
        existingUser.name = user.name ?? existingUser.name;
        existingUser.email = user.email.toLowerCase();
        existingUser.image = user.image ?? existingUser.image ?? null;
        existingUser.googleId = account.providerAccountId;

        if (account.access_token) {
          existingUser.googleAccessToken = account.access_token;
        }

        if (account.refresh_token) {
          existingUser.googleRefreshToken = account.refresh_token;
        }

        if (account.expires_at) {
          existingUser.googleTokenExpiresAt = new Date(account.expires_at * 1000);
        }

        await existingUser.save();
      }

      (user as typeof user & { id?: string; onboardingComplete?: boolean }).id = String(dbUser._id);
      (user as typeof user & { onboardingComplete?: boolean }).onboardingComplete =
        dbUser.onboardingComplete;

      return true;
    },
    async jwt({ token, account, user }) {
      await connectDatabase();

      const dbUser: any =
        user && "id" in user && user.id
          ? await User.findById(user.id).lean()
          : token.userId
            ? await User.findById(token.userId).lean()
            : user?.email
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

      if (account?.access_token) {
        token.googleAccessToken = account.access_token;
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
