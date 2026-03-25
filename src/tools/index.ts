import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerGetCalendarEventsTool } from "./getCalendarEvents.js";
import { registerGetCommuteTool } from "./getCommute.js";
import { registerGetEmailsTool } from "./getEmails.js";
import { registerGetFineappAuditUpdatesTool } from "./getFineappAuditUpdates.js";
import { registerGetMorningBriefTool } from "./getMorningBrief.js";
import { registerGetWeatherTool } from "./getWeather.js";

export const registerTools = (server: McpServer): void => {
  registerGetWeatherTool(server);
  registerGetCommuteTool(server);
  registerGetEmailsTool(server);
  registerGetCalendarEventsTool(server);
  registerGetFineappAuditUpdatesTool(server);
  registerGetMorningBriefTool(server);
};
