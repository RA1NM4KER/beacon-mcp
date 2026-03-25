import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchCalendarEvents } from "../providers/calendar.js";
import { CalendarEventsInputSchema } from "../schemas/calendar.js";
import { toJsonContent } from "./shared.js";

export const registerGetCalendarEventsTool = (server: McpServer): void => {
  server.registerTool(
    "get_calendar_events",
    {
      description: "Get calendar events for a date or date range",
      inputSchema: CalendarEventsInputSchema,
    },
    async (input) => toJsonContent(await fetchCalendarEvents(input)),
  );
};
