import { User } from "../models/User";

const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const DEFAULT_TASK_LIST_ID = "@default";

async function refreshGoogleAccessToken(user: any) {
  if (!user.googleRefreshToken) {
    throw new Error("Google Tasks refresh token is missing");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID || "",
      client_secret: process.env.AUTH_GOOGLE_SECRET || "",
      refresh_token: user.googleRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google Tasks token");
  }

  const tokens = await response.json();
  user.googleAccessToken = tokens.access_token;
  user.googleTokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;
  await user.save();

  return user.googleAccessToken as string;
}

async function getGoogleAccessToken(user: any) {
  const expiresAt = user.googleTokenExpiresAt ? new Date(user.googleTokenExpiresAt).getTime() : 0;
  const hasValidAccessToken =
    !!user.googleAccessToken && (!expiresAt || expiresAt > Date.now() + 60_000);

  if (hasValidAccessToken) {
    return user.googleAccessToken as string;
  }

  return refreshGoogleAccessToken(user);
}

async function googleTasksRequest<T>(
  accessToken: string,
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Tasks request failed: ${response.status} ${errorText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

function buildTaskNotes(task: { notes?: string | null; recurrence: string }) {
  const parts = [];

  if (task.notes?.trim()) {
    parts.push(task.notes.trim());
  }

  if (task.recurrence !== "none") {
    parts.push(`Repeats: ${task.recurrence}`);
  }

  parts.push("Created by LiveWell");
  return parts.join("\n\n");
}

function toGoogleDueDate(dueDate: string) {
  return `${dueDate}T12:00:00.000Z`;
}

export async function createGoogleTaskForTask(
  userId: string,
  task: { title: string; dueDate: string; notes?: string | null; recurrence: string }
) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Current user not found");
  }

  if (!user.googleRefreshToken && !user.googleAccessToken) {
    throw new Error("Google Tasks is not connected for this user. Sign out and sign back in to grant tasks access.");
  }

  const accessToken = await getGoogleAccessToken(user);

  return googleTasksRequest<{
    id: string;
    title?: string;
    due?: string;
    notes?: string;
    webViewLink?: string;
  }>(accessToken, `/lists/${DEFAULT_TASK_LIST_ID}/tasks`, {
    method: "POST",
    body: JSON.stringify({
      title: task.title,
      notes: buildTaskNotes(task),
      due: toGoogleDueDate(task.dueDate),
    }),
  });
}

export async function listUpcomingGoogleTasks(userId: string) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Current user not found");
  }

  if (!user.googleRefreshToken && !user.googleAccessToken) {
    throw new Error("Google Tasks is not connected for this user. Sign out and sign back in to grant tasks access.");
  }

  const accessToken = await getGoogleAccessToken(user);
  const response = await googleTasksRequest<{
    items?: Array<{
      id: string;
      title?: string;
      due?: string;
      notes?: string;
      webViewLink?: string;
      status?: string;
    }>;
  }>(
    accessToken,
    `/lists/${DEFAULT_TASK_LIST_ID}/tasks?showCompleted=false&showDeleted=false&maxResults=100`
  );

  return (response.items || [])
    .filter((task) => !!task.due)
    .sort((left, right) => new Date(left.due || "").getTime() - new Date(right.due || "").getTime())
    .map((task) => ({
      id: task.id,
      title: task.title || "Untitled task",
      due: task.due || null,
      notes: task.notes || null,
      webViewLink: task.webViewLink || null,
    }));
}

export { GOOGLE_TASKS_SCOPE };
