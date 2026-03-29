import { getServerSession } from "next-auth";

import { authOptions } from "../../auth";
import { User } from "../models/User";
import { syncUserSuiteState } from "./suiteMembership";

export interface SessionUserContext {
  userId: string;
  suiteId: string;
  suiteIds: string[];
  activeSuiteId: string | null;
  email?: string;
}

export async function getSessionUserContext(): Promise<SessionUserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  let user: any = null;
  if (session.user.id) {
    user = await User.findById(session.user.id);
  }
  if (!user && session.user.email) {
    user = await User.findOne({ email: session.user.email });
  }
  if (!user) return null;

  const { suiteIds, activeSuiteId } = await syncUserSuiteState(user);
  const suiteId = activeSuiteId ?? "";
  if (!suiteIds.length) {
    return {
      userId: String(user._id),
      suiteId,
      suiteIds,
      activeSuiteId,
      email: user.email ? String(user.email) : undefined,
    };
  }

  return {
    userId: String(user._id),
    suiteId,
    suiteIds,
    activeSuiteId,
    email: user.email ? String(user.email) : undefined,
  };
}
