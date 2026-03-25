import type {
  LocalDateParts,
  LocalTimeParts,
  ZonedParts,
} from "../types/time.js";

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[ t](\d{1,2})(?::(\d{2}))?$/i;

export function nowInTimezone(timeZone: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    year: Number.parseInt(lookup.year, 10),
    month: Number.parseInt(lookup.month, 10),
    day: Number.parseInt(lookup.day, 10),
    hour: Number.parseInt(lookup.hour, 10),
    minute: Number.parseInt(lookup.minute, 10),
    second: Number.parseInt(lookup.second, 10),
  };
}

export function formatLocalDate(parts: LocalDateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function localDateFromNow(timeZone: string): LocalDateParts {
  const nowParts = getZonedParts(new Date(), timeZone);

  return {
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
  };
}

export function shiftLocalDate(
  parts: LocalDateParts,
  dayOffset: number,
): LocalDateParts {
  const baseUtcMillis = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    12,
    0,
    0,
  );
  const shiftedDate = new Date(baseUtcMillis + dayOffset * 24 * 60 * 60 * 1000);

  return {
    year: shiftedDate.getUTCFullYear(),
    month: shiftedDate.getUTCMonth() + 1,
    day: shiftedDate.getUTCDate(),
  };
}

export function zonedDateTimeToUtcIso(
  dateParts: LocalDateParts & LocalTimeParts,
  timeZone: string,
): string {
  const targetMillis = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    0,
  );

  let utcMillis = targetMillis;

  for (let index = 0; index < 5; index += 1) {
    const zonedParts = getZonedParts(new Date(utcMillis), timeZone);
    const observedMillis = Date.UTC(
      zonedParts.year,
      zonedParts.month - 1,
      zonedParts.day,
      zonedParts.hour,
      zonedParts.minute,
      0,
    );
    const diffMillis = targetMillis - observedMillis;

    if (diffMillis === 0) {
      return new Date(utcMillis).toISOString();
    }

    utcMillis += diffMillis;
  }

  return new Date(utcMillis).toISOString();
}

export function parseLocalDate(value: string): LocalDateParts | null {
  const match = value.trim().match(LOCAL_DATE_RE);

  if (!match) {
    return null;
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

export function parseFlexibleDateTime(
  value: string,
  timeZone: string,
  defaultTime: LocalTimeParts = { hour: 0, minute: 0 },
): string {
  const trimmed = value.trim();
  const directDate = new Date(trimmed);

  if (
    !Number.isNaN(directDate.getTime()) &&
    /(?:z|[+-]\d{2}:\d{2})$/i.test(trimmed)
  ) {
    return directDate.toISOString();
  }

  const localDate = parseLocalDate(trimmed);

  if (localDate) {
    return zonedDateTimeToUtcIso({ ...localDate, ...defaultTime }, timeZone);
  }

  const dateTimeMatch = trimmed.match(LOCAL_DATE_TIME_RE);

  if (dateTimeMatch) {
    return zonedDateTimeToUtcIso(
      {
        year: Number.parseInt(dateTimeMatch[1], 10),
        month: Number.parseInt(dateTimeMatch[2], 10),
        day: Number.parseInt(dateTimeMatch[3], 10),
        hour: Number.parseInt(dateTimeMatch[4], 10),
        minute: dateTimeMatch[5] ? Number.parseInt(dateTimeMatch[5], 10) : 0,
      },
      timeZone,
    );
  }

  throw new Error(
    `Unsupported date/time format: ${value}. Use ISO 8601 with timezone, YYYY-MM-DD, or YYYY-MM-DD HH:mm.`,
  );
}

export function resolveDateRange(
  input: { date?: string; dateFrom?: string; dateTo?: string },
  timeZone: string,
) {
  if (input.date) {
    const localDate = parseLocalDate(input.date);

    if (!localDate) {
      throw new Error(
        `Unsupported date format: ${input.date}. Use YYYY-MM-DD.`,
      );
    }

    const nextDate = shiftLocalDate(localDate, 1);

    return {
      startIso: zonedDateTimeToUtcIso(
        { ...localDate, hour: 0, minute: 0 },
        timeZone,
      ),
      endIso: zonedDateTimeToUtcIso(
        { ...nextDate, hour: 0, minute: 0 },
        timeZone,
      ),
      date: formatLocalDate(localDate),
    };
  }

  const today = localDateFromNow(timeZone);
  const defaultStart = zonedDateTimeToUtcIso(
    { ...today, hour: 0, minute: 0 },
    timeZone,
  );
  const defaultEnd = zonedDateTimeToUtcIso(
    { ...shiftLocalDate(today, 1), hour: 0, minute: 0 },
    timeZone,
  );

  return {
    startIso: input.dateFrom
      ? parseFlexibleDateTime(input.dateFrom, timeZone, { hour: 0, minute: 0 })
      : defaultStart,
    endIso: input.dateTo
      ? parseFlexibleDateTime(input.dateTo, timeZone, { hour: 23, minute: 59 })
      : defaultEnd,
    date: null,
  };
}
