import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchFineappAudit } from "../providers/fineappAudit.js";
import { FineappAuditInputSchema } from "../schemas/fineappAudit.js";
import { toJsonContent } from "./shared.js";

export const registerGetFineappAuditUpdatesTool = (server: McpServer): void => {
  server.registerTool(
    "get_fineapp_audit_updates",
    {
      description:
        "Get recent FineApp admin audit log items with optional filters",
      inputSchema: FineappAuditInputSchema,
    },
    async (input) => toJsonContent(await fetchFineappAudit(input)),
  );
};
