import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchEmails } from "../providers/gmail.js";
import { EmailsInputSchema } from "../schemas/gmail.js";
import { buildEmailFetchOptions } from "./emailOptions.js";
import { toJsonContent } from "./shared.js";

export const registerGetEmailsTool = (server: McpServer): void => {
  server.registerTool(
    "get_emails",
    {
      description:
        "Get emails with Gmail-style query, label, unread filter, and result limit",
      inputSchema: EmailsInputSchema,
    },
    async (input) =>
      toJsonContent(await fetchEmails(buildEmailFetchOptions(input))),
  );
};
