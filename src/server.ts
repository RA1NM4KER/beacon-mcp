import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

export const createServer = (): McpServer => {
  const server = new McpServer(
    {
      name: "beacon-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    },
  );

  registerResources(server);
  registerTools(server);

  return server;
};
