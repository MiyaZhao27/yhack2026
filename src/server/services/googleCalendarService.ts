import { User } from "../models/User";

const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

async function refreshGoogleAccessToken(user: any) {
  if (!user.googleRefreshToken) {
    throw new Error("Google Calendar refresh token is missing");
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
    throw new Error("Failed to refresh Google Calendar token");
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

async function googleCalendarRequest<T>(
  accessToken: string,
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function createCalendarEventForTask(
  userId: string,
  task: { title: string; dueDate: string; dueTime?: string | null; notes?: string | null; recurrence: string }
) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Current user not found");
  }

  if (!user.googleRefreshToken && !user.googleAccessToken) {
    throw new Error("Google Calendar is not connected for this user. Sign out and sign back in to grant calendar access.");
  }

  const accessToken = await getGoogleAccessToken(user);
  const start = new Date(`${task.dueDate}T${task.dueTime || "09:00"}`);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return googleCalendarRequest<{
    id: string;
    htmlLink?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
  }>(accessToken, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify({
      summary: task.title,
      description:
        [task.notes?.trim(), task.recurrence === "none" ? "Created by SuiteEase" : `Created by SuiteEase (${task.recurrence} chore)`]
          .filter(Boolean)
          .join("\n\n"),
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });
}

export async function listUpcomingCalendarEvents(userId: string) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Current user not found");
  }

  if (!user.googleRefreshToken && !user.googleAccessToken) {
    throw new Error("Google Calendar is not connected for this user. Sign out and sign back in to grant calendar access.");
  }

  const accessToken = await getGoogleAccessToken(user);

  const response = await googleCalendarRequest<{
    items?: Array<{
      id: string;
      summary?: string;
      htmlLink?: string;
      start?: { date?: string; dateTime?: string };
      end?: { date?: string; dateTime?: string };
      description?: string;
    }>;
  }>(
    accessToken,
    `/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      new Date().toISOString()
    )}&maxResults=10`
  );

  return (response.items || []).map((event) => ({
    id: event.id,
    title: event.summary || "Untitled event",
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    notes: event.description || null,
    htmlLink: event.htmlLink || null,
  }));
}

export { GOOGLE_CALENDAR_EVENTS_SCOPE, GOOGLE_CALENDAR_READONLY_SCOPE };
