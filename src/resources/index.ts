import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

const SERVER_INFO_URI = "beacon://server/info";
const TOOL_URI_TEMPLATE = "beacon://tools/{name}";

const TOOL_CATALOG = [
  {
    name: "get_weather",
    description: "Get weather for a location, date range, or specific hour",
  },
  {
    name: "get_commute",
    description:
      "Get commute time and traffic from home to destination, optionally for a future departure time",
  },
  {
    name: "get_emails",
    description:
      "Get emails with Gmail-style query, label, unread filter, and result limit",
  },
  {
    name: "get_calendar_events",
    description: "Get calendar events for a date or date range",
  },
  {
    name: "get_fineapp_audit_updates",
    description:
      "Get recent FineApp admin audit log items with optional filters",
  },
  {
    name: "get_morning_brief",
    description:
      "Get a morning briefing with optional overrides for weather, commute, email, calendar, and FineApp filters",
  },
] as const;

export const registerResources = (server: McpServer): void => {
  server.registerResource(
    "server_info",
    SERVER_INFO_URI,
    {
      title: "Beacon Server Info",
      description: "Server metadata and the list of Beacon tools",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: SERVER_INFO_URI,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              name: "beacon-mcp",
              version: "1.0.0",
              tools: TOOL_CATALOG,
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerResource(
    "tool_details",
    new ResourceTemplate(TOOL_URI_TEMPLATE, {
      list: async () => ({
        resources: TOOL_CATALOG.map((tool) => ({
          uri: `beacon://tools/${tool.name}`,
          name: tool.name,
          title: `Tool: ${tool.name}`,
          description: tool.description,
          mimeType: "application/json",
        })),
      }),
    }),
    {
      title: "Beacon Tool Details",
      description: "Per-tool metadata for Beacon tools",
      mimeType: "application/json",
    },
    async (_uri, variables) => {
      const tool = TOOL_CATALOG.find((entry) => entry.name === variables.name);

      if (!tool) {
        throw new Error(`Unknown tool resource: ${variables.name}`);
      }

      return {
        contents: [
          {
            uri: `beacon://tools/${tool.name}`,
            mimeType: "application/json",
            text: JSON.stringify(tool, null, 2),
          },
        ],
      };
    },
  );
};
