import { Types } from "mongoose";

type MaybeSuiteRef = Types.ObjectId | string | null | undefined;

interface SuiteStateUser {
  suiteId?: MaybeSuiteRef;
  suiteIds?: MaybeSuiteRef[];
  activeSuiteId?: MaybeSuiteRef;
  save?: () => Promise<unknown>;
}

function normalizeSuiteRef(value: MaybeSuiteRef) {
  if (!value) return null;
  return String(value);
}

export function getSuiteMembershipIds(user: SuiteStateUser | null | undefined) {
  if (!user) return [];

  const normalized = new Set<string>();

  for (const suiteId of user.suiteIds ?? []) {
    const value = normalizeSuiteRef(suiteId);
    if (value) {
      normalized.add(value);
    }
  }

  const legacySuiteId = normalizeSuiteRef(user.suiteId);
  if (legacySuiteId) {
    normalized.add(legacySuiteId);
  }

  return [...normalized];
}

export function getResolvedActiveSuiteId(user: SuiteStateUser | null | undefined) {
  if (!user) return null;

  const suiteIds = getSuiteMembershipIds(user);
  if (!suiteIds.length) {
    return null;
  }

  const explicitActiveSuiteId = normalizeSuiteRef(user.activeSuiteId);
  if (explicitActiveSuiteId && suiteIds.includes(explicitActiveSuiteId)) {
    return explicitActiveSuiteId;
  }

  const legacySuiteId = normalizeSuiteRef(user.suiteId);
  if (legacySuiteId && suiteIds.includes(legacySuiteId)) {
    return legacySuiteId;
  }

  return suiteIds[0] ?? null;
}

export function userHasSuiteAccess(
  user: SuiteStateUser | null | undefined,
  suiteId: string | null | undefined
) {
  if (!user || !suiteId) return false;
  return getSuiteMembershipIds(user).includes(String(suiteId));
}

export function buildSuiteMembershipQuery(suiteId: string) {
  return {
    $or: [{ suiteIds: suiteId }, { suiteId }],
  };
}

export async function syncUserSuiteState<T extends SuiteStateUser>(user: T) {
  const suiteIds = getSuiteMembershipIds(user);
  const activeSuiteId = getResolvedActiveSuiteId(user);

  let changed = false;
  const nextSuiteIds = suiteIds.map((suiteId) =>
    Types.ObjectId.isValid(suiteId) ? new Types.ObjectId(suiteId) : suiteId
  );
  const nextActiveSuiteId =
    activeSuiteId && Types.ObjectId.isValid(activeSuiteId)
      ? new Types.ObjectId(activeSuiteId)
      : activeSuiteId ?? null;

  if (JSON.stringify((user.suiteIds ?? []).map((suiteId) => String(suiteId))) !== JSON.stringify(suiteIds)) {
    user.suiteIds = nextSuiteIds;
    changed = true;
  }

  if (String(user.activeSuiteId ?? "") !== String(activeSuiteId ?? "")) {
    user.activeSuiteId = nextActiveSuiteId;
    changed = true;
  }

  if (String(user.suiteId ?? "") !== String(activeSuiteId ?? "")) {
    user.suiteId = nextActiveSuiteId;
    changed = true;
  }

  if (changed && typeof user.save === "function") {
    await user.save();
  }

  return {
    suiteIds,
    activeSuiteId,
  };
}
