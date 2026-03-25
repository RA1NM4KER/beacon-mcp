import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchCommute } from "../providers/commute.js";
import { fetchCalendarEvents } from "../providers/calendar.js";
import { fetchEmails } from "../providers/gmail.js";
import { fetchFineappAudit } from "../providers/fineappAudit.js";
import { fetchWeather } from "../providers/weather.js";
import { MorningBriefInputSchema } from "../schemas/morningBrief.js";
import { env } from "../utils/env.js";
import { nowInTimezone } from "../utils/time.js";
import { buildEmailFetchOptions } from "./emailOptions.js";
import { toJsonContent } from "./shared.js";

export const registerGetMorningBriefTool = (server: McpServer): void => {
  server.registerTool(
    "get_morning_brief",
    {
      description:
        "Get a morning briefing with optional overrides for weather, commute, email, calendar, and FineApp filters",
      inputSchema: MorningBriefInputSchema,
    },
    async (input) => {
      const [weather, commute, email, calendar, fineapp] = await Promise.all([
        fetchWeather({
          location: input.weatherLocation,
          date: input.weatherDate,
          days: input.weatherDays,
          hour: input.weatherHour,
        }),
        fetchCommute(
          input.commuteFrom ?? env.HOME_ADDRESS,
          input.commuteTo ?? env.CAMPUS_ADDRESS,
          input.commuteDepartureAt,
        ),
        fetchEmails(buildEmailFetchOptions(input)),
        fetchCalendarEvents({
          date: input.calendarDate,
          dateFrom: input.calendarDateFrom,
          dateTo: input.calendarDateTo,
          maxResults: input.calendarMaxResults ?? 10,
        }),
        fetchFineappAudit({
          page: input.fineappPage ?? 0,
          size: input.fineappSize ?? 10,
          success: input.fineappSuccess,
          actorEmail: input.fineappActorEmail,
          action: input.fineappAction,
          targetEntityType: input.fineappTargetEntityType,
          dateFrom: input.fineappDateFrom,
          dateTo: input.fineappDateTo,
        }),
      ]);

      const summary =
        `Weather ${weather.temperatureC}°C and ${weather.condition.toLowerCase()}. ` +
        `Commute is ${commute.durationMinutes} min. ` +
        `You have ${email.unreadCount} unread emails, ${calendar.count} calendar events in scope, and ${fineapp.count} FineApp audit items in scope.`;

      return toJsonContent({
        generatedAt: nowInTimezone(env.TIMEZONE),
        weather,
        commute,
        email,
        calendar,
        fineapp,
        summary,
      });
    },
  );
};
