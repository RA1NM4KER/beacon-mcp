import type { CalendarEventsOutput } from "../schemas/calendar.js";
import type {
  FetchCalendarEventsOptions,
  GoogleCalendarEventsResponse,
} from "../types/calendar.js";
import { env } from "../utils/env.js";
import { resolveDateRange } from "../utils/time.js";
import { fetchGoogleAccessToken } from "./googleAuth.js";

export async function fetchCalendarEvents(
  options: FetchCalendarEventsOptions = {},
): Promise<CalendarEventsOutput> {
  const accessToken = await fetchGoogleAccessToken();
  const range = resolveDateRange(options, env.TIMEZONE);
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events`,
  );

  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", range.startIso);
  url.searchParams.set("timeMax", range.endIso);
  url.searchParams.set("maxResults", String(options.maxResults ?? 20));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Calendar request failed: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as GoogleCalendarEventsResponse;
  const events = (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? "Untitled event",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
    location: item.location ?? null,
    description: item.description ?? null,
    status: item.status ?? null,
    htmlLink: item.htmlLink ?? null,
    allDay: Boolean(item.start?.date && !item.start?.dateTime),
  }));

  return {
    count: events.length,
    date: range.date,
    dateFrom: range.startIso,
    dateTo: range.endIso,
    events,
  };
}
