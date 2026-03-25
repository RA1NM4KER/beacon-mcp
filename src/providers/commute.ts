import type { CommuteOutput } from "../schemas/commute.js";
import type { ComputeRoutesResponse } from "../types/commute.js";
import { env } from "../utils/env.js";
import {
  getZonedParts,
  shiftLocalDate,
  zonedDateTimeToUtcIso,
} from "../utils/time.js";

function parseDurationSeconds(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number.parseFloat(value.replace(/s$/, ""));
  return Number.isFinite(seconds) ? seconds : null;
}

function toWholeMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function formatTrafficLevel(
  durationSeconds: number,
  staticDurationSeconds: number | null,
): string {
  if (staticDurationSeconds === null || staticDurationSeconds <= 0) {
    return "Unknown";
  }

  const slowdownRatio = durationSeconds / staticDurationSeconds;

  if (slowdownRatio < 1.1) {
    return "Low";
  }

  if (slowdownRatio < 1.3) {
    return "Moderate";
  }

  return "High";
}

function parseTimeString(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);

  if (!match) {
    return null;
  }

  const rawHour = Number.parseInt(match[1], 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (minute > 59) {
    return null;
  }

  if (meridiem) {
    if (rawHour < 1 || rawHour > 12) {
      return null;
    }

    const hour = (rawHour % 12) + (meridiem === "pm" ? 12 : 0);
    return { hour, minute };
  }

  if (rawHour > 23) {
    return null;
  }

  return { hour: rawHour, minute };
}

function parseDepartureAt(value: string, timeZone: string): string {
  const directDate = new Date(value);

  if (
    !Number.isNaN(directDate.getTime()) &&
    /(?:z|[+-]\d{2}:\d{2})$/i.test(value.trim())
  ) {
    return directDate.toISOString();
  }

  const now = new Date();
  const nowParts = getZonedParts(now, timeZone);
  const trimmed = value.trim();
  const relativeMatch = trimmed.match(
    /^(today|tomorrow)(?:\s+at\s+|\s+)?(.+)$/i,
  );

  if (relativeMatch) {
    const dayKeyword = relativeMatch[1].toLowerCase();
    const parsedTime = parseTimeString(relativeMatch[2]);

    if (!parsedTime) {
      throw new Error(`Unsupported departureAt time: ${value}`);
    }

    const dayOffset = dayKeyword === "tomorrow" ? 1 : 0;
    const localDate = shiftLocalDate(
      {
        year: nowParts.year,
        month: nowParts.month,
        day: nowParts.day,
      },
      dayOffset,
    );

    return zonedDateTimeToUtcIso(
      {
        year: localDate.year,
        month: localDate.month,
        day: localDate.day,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
      },
      timeZone,
    );
  }

  const localDateTimeMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i,
  );

  if (localDateTimeMatch) {
    const year = Number.parseInt(localDateTimeMatch[1], 10);
    const month = Number.parseInt(localDateTimeMatch[2], 10);
    const day = Number.parseInt(localDateTimeMatch[3], 10);
    const hourPart = localDateTimeMatch[4];
    const minutePart = localDateTimeMatch[5];
    const meridiemPart = localDateTimeMatch[6];
    const timeValue = hourPart
      ? `${hourPart}${minutePart ? `:${minutePart}` : ""}${meridiemPart ? ` ${meridiemPart}` : ""}`
      : "";
    const parsedTime = timeValue
      ? parseTimeString(timeValue)
      : { hour: 8, minute: 0 };

    if (!parsedTime) {
      throw new Error(`Unsupported departureAt time: ${value}`);
    }

    return zonedDateTimeToUtcIso(
      { year, month, day, hour: parsedTime.hour, minute: parsedTime.minute },
      timeZone,
    );
  }

  throw new Error(
    "Unsupported departureAt format. Use ISO 8601 with timezone, YYYY-MM-DD HH:mm, or phrases like 'tomorrow at 8am'.",
  );
}

export async function fetchCommute(
  from: string,
  to: string,
  departureAt?: string,
): Promise<CommuteOutput> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const departureTime = departureAt
    ? parseDepartureAt(departureAt, env.TIMEZONE)
    : undefined;

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
      },
      body: JSON.stringify({
        origin: {
          address: from,
        },
        destination: {
          address: to,
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        departureTime,
        languageCode: "en-US",
        units: "METRIC",
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Routes API request failed: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as ComputeRoutesResponse;
  const route = data.routes?.[0];
  const durationSeconds = parseDurationSeconds(route?.duration);

  if (durationSeconds === null) {
    throw new Error(
      "Google Routes API response did not include a route duration",
    );
  }

  const staticDurationSeconds = parseDurationSeconds(route?.staticDuration);

  return {
    from,
    to,
    durationMinutes: toWholeMinutes(durationSeconds),
    trafficLevel: formatTrafficLevel(durationSeconds, staticDurationSeconds),
    departureAt: departureTime ?? null,
    leaveBy: null,
  };
}
