import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchCommute } from "../providers/commute.js";
import { CommuteInputSchema } from "../schemas/commute.js";
import { env } from "../utils/env.js";
import { toJsonContent } from "./shared.js";

export const registerGetCommuteTool = (server: McpServer): void => {
  server.registerTool(
    "get_commute",
    {
      description:
        "Get commute time and traffic from home to destination, optionally for a future departure time",
      inputSchema: CommuteInputSchema,
    },
    async (input) =>
      toJsonContent(
        await fetchCommute(
          input.from ?? env.HOME_ADDRESS,
          input.to ?? env.CAMPUS_ADDRESS,
          input.departureAt,
        ),
      ),
  );
};
