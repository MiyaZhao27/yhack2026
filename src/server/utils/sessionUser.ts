import { getServerSession } from "next-auth";

import { authOptions } from "../../auth";
import { User } from "../models/User";

export interface SessionUserContext {
  userId: string;
  suiteId: string;
  email?: string;
}

export async function getSessionUserContext(): Promise<SessionUserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  let user: any = null;
  if (session.user.id) {
    user = await User.findById(session.user.id).lean();
  }
  if (!user && session.user.email) {
    user = await User.findOne({ email: session.user.email }).lean();
  }
  if (!user) return null;

  const suiteId = user.suiteId ? String(user.suiteId) : "";
  if (!suiteId) return null;

  return {
    userId: String(user._id),
    suiteId,
    email: user.email ? String(user.email) : undefined,
  };
}
