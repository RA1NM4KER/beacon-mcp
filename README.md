# Beacon MCP

`beacon-mcp` is a personal local TypeScript Model Context Protocol server that turns a small set of personal and operational data sources into MCP tools.

It exposes:

- weather lookups
- commute estimates with traffic
- Gmail inbox queries
- Google Calendar event queries
- FineApp admin audit log lookups
- a combined morning brief that aggregates the above

The server runs over `stdio`, so it can be attached directly to MCP-compatible clients such as Codex, Claude Desktop, or custom MCP hosts.

## What It Does

Beacon is designed to answer practical day-start and operational questions, for example:

- "What is the weather in Stellenbosch this afternoon?"
- "How long will the drive be tomorrow at 8am?"
- "Show my unread important emails."
- "What meetings do I have today?"
- "What happened in FineApp admin audit logs this morning?"
- "Give me a full morning brief."

## Tools

Beacon registers these MCP tools:

| Tool                        | Purpose                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `get_weather`               | Weather for a location, date range, or specific hour            |
| `get_commute`               | Drive time and traffic between two addresses                    |
| `get_emails`                | Gmail search with query, label, unread filter, and limit        |
| `get_calendar_events`       | Calendar events for a date or date range                        |
| `get_fineapp_audit_updates` | FineApp admin audit log lookup with filters                     |
| `get_morning_brief`         | Aggregated weather, commute, email, calendar, and audit summary |

## Resources

Beacon also exposes MCP resources:

- `beacon://server/info`
- `beacon://tools/{name}`

These provide lightweight server and tool metadata for MCP clients that support resources.

## Requirements

- Node.js 20+
- npm
- API credentials for the integrations you want to use

## Installation

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the credentials and defaults you need.

## Environment Variables

| Variable               | Required           | Purpose                                              |
| ---------------------- | ------------------ | ---------------------------------------------------- |
| `WEATHER_API_KEY`      | For weather        | WeatherAPI key                                       |
| `WEATHER_LOCATION`     | No                 | Default weather location. Defaults to `Stellenbosch` |
| `GOOGLE_MAPS_API_KEY`  | For commute        | Google Routes API key                                |
| `GMAIL_CLIENT_ID`      | For Gmail/Calendar | Google OAuth client ID                               |
| `GMAIL_CLIENT_SECRET`  | For Gmail/Calendar | Google OAuth client secret                           |
| `GMAIL_REFRESH_TOKEN`  | For Gmail/Calendar | Google refresh token used to mint access tokens      |
| `GOOGLE_CALENDAR_ID`   | No                 | Calendar ID. Defaults to `primary`                   |
| `FINEAPP_API_BASE_URL` | No                 | FineApp API base URL                                 |
| `FINEAPP_ADMIN_TOKEN`  | For FineApp        | Bearer token for admin audit access                  |
| `HOME_ADDRESS`         | No                 | Default commute origin. Defaults to `Home`           |
| `CAMPUS_ADDRESS`       | No                 | Default commute destination. Defaults to `Campus`    |
| `TIMEZONE`             | No                 | Default timezone. Defaults to `Africa/Johannesburg`  |

## Run

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start compiled server:

```bash
npm run start
```

## MCP Client Configuration

Example MCP server entry pointing at the TypeScript source in development:

```json
{
  "mcpServers": {
    "beacon": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/beacon-mcp/src/index.ts"],
      "env": {
        "WEATHER_API_KEY": "your-key",
        "GOOGLE_MAPS_API_KEY": "your-key",
        "GMAIL_CLIENT_ID": "your-client-id",
        "GMAIL_CLIENT_SECRET": "your-client-secret",
        "GMAIL_REFRESH_TOKEN": "your-refresh-token",
        "FINEAPP_ADMIN_TOKEN": "your-token",
        "TIMEZONE": "Africa/Johannesburg"
      }
    }
  }
}
```

Example using the compiled build:

```json
{
  "mcpServers": {
    "beacon": {
      "command": "node",
      "args": ["/absolute/path/to/beacon-mcp/dist/index.js"]
    }
  }
}
```

## Input Notes

- Weather dates expect `YYYY-MM-DD`.
- Commute `departureAt` accepts:
  - full ISO timestamps with timezone
  - `YYYY-MM-DD HH:mm`
  - phrases like `today at 8am` or `tomorrow at 8am`
- Gmail search uses standard Gmail query syntax plus optional label and unread filtering.
- Calendar lookups accept either a single `date` or a `dateFrom` / `dateTo` range.

## Development

Available scripts:

```bash
npm run dev
npm run build
npm run test
npm run test:coverage
npm run format
npm run format:check
```

## Project Structure

```text
src/
  index.ts          stdio entrypoint
  server.ts         MCP server construction
  tools/            MCP tool registration
  resources/        MCP resources and templates
  providers/        external API integrations
  schemas/          zod input/output schemas
  utils/            env and time helpers
tests/              server, provider, and tool tests
```

## Notes

- The server only succeeds for tools whose required credentials are configured.
- Gmail and Google Calendar both use the same Google OAuth refresh-token flow.
- The morning brief runs multiple providers in parallel and returns a summarized combined payload.
