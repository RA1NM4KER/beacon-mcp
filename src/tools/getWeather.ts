import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchWeather } from "../providers/weather.js";
import { WeatherInputSchema } from "../schemas/weather.js";
import { toJsonContent } from "./shared.js";

export const registerGetWeatherTool = (server: McpServer): void => {
  server.registerTool(
    "get_weather",
    {
      description: "Get weather for a location, date range, or specific hour",
      inputSchema: WeatherInputSchema,
    },
    async (input) => toJsonContent(await fetchWeather(input)),
  );
};
