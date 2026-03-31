import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../src/server.js";
import { env } from "../src/utils/env.js";

const originalFetch = globalThis.fetch;
const originalEnv = { ...env };

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(env, originalEnv);
});

test("get_morning_brief tool returns aggregated content", async () => {
  env.WEATHER_API_KEY = "weather-key";
  env.WEATHER_LOCATION = "Stellenbosch";
  env.GOOGLE_MAPS_API_KEY = "maps-key";
  env.GMAIL_CLIENT_ID = "client-id";
  env.GMAIL_CLIENT_SECRET = "client-secret";
  env.GMAIL_REFRESH_TOKEN = "refresh-token";
  env.GOOGLE_CALENDAR_ID = "primary";
  env.FINEAPP_ADMIN_TOKEN = "fineapp-token";
  env.FINEAPP_API_BASE_URL = "https://fineapp.example.com";
  env.HOME_ADDRESS = "Home";
  env.CAMPUS_ADDRESS = "Campus";
  env.TIMEZONE = "Africa/Johannesburg";

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.hostname === "api.weatherapi.com") {
      return jsonResponse({
        location: {
          name: "Stellenbosch",
          region: "Western Cape",
          country: "South Africa",
        },
        current: {
          temp_c: 24.1,
          feelslike_c: 25.6,
          humidity: 57,
          wind_kph: 17.6,
          is_day: 1,
          condition: {
            text: "Partly cloudy",
          },
        },
        forecast: {
          forecastday: [
            {
              date: "2026-03-25",
              day: {
                maxtemp_c: 23.3,
                mintemp_c: 13.9,
                avgtemp_c: 18.5,
                daily_chance_of_rain: 82,
                condition: {
                  text: "Patchy rain nearby",
                },
              },
            },
          ],
        },
      });
    }

    if (url.hostname === "routes.googleapis.com") {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.origin.address, "Home");
      return jsonResponse({
        routes: [
          {
            duration: "600s",
            staticDuration: "580s",
          },
        ],
      });
    }

    if (url.hostname === "oauth2.googleapis.com") {
      return jsonResponse({ access_token: "token-123" });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/messages" &&
      url.searchParams.get("maxResults") === "5"
    ) {
      return jsonResponse({
        messages: [],
        resultSizeEstimate: 3,
      });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/labels/UNREAD"
    ) {
      return jsonResponse({
        id: "UNREAD",
        name: "UNREAD",
        messagesUnread: 3,
      });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/labels/IMPORTANT"
    ) {
      return jsonResponse({
        id: "IMPORTANT",
        name: "IMPORTANT",
        messagesUnread: 1,
      });
    }

    if (url.hostname === "www.googleapis.com") {
      return jsonResponse({
        items: [
          {
            id: "event-1",
            summary: "Connect Group",
            start: { dateTime: "2026-03-25T19:00:00+02:00" },
            end: { dateTime: "2026-03-25T20:00:00+02:00" },
          },
        ],
      });
    }

    if (url.hostname === "fineapp.example.com") {
      return jsonResponse({
        content: [
          {
            id: 1,
            actorUserId: 10,
            actorEmail: "user@example.com",
            actorRoles: "client",
            action: "BOOKING_MESSAGE_SENT",
            logMessage: "Message sent",
            targetEntityType: "BOOKING",
            targetEntityId: "booking-1",
            requestId: "req-1",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            success: true,
            httpStatus: null,
            errorCode: null,
            dataFromJson: null,
            dataToJson: null,
            createdAt: "2026-03-25T10:00:00.000Z",
          },
        ],
        totalPages: 1,
        totalElements: 1,
        size: 100,
        number: 0,
        numberOfElements: 1,
        last: true,
      });
    }

    throw new Error(`Unexpected fetch call: ${url.toString()}`);
  };

  const server = createServer();
  const client = new Client({
    name: "beacon-mcp-test-client",
    version: "1.0.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.callTool({
      name: "get_morning_brief",
      arguments: {},
    });

    assert.ok("content" in result);
    assert.equal(result.content[0].type, "text");

    const payload = JSON.parse(result.content[0].text);

    assert.equal(
      payload.weather.location,
      "Stellenbosch, Western Cape, South Africa",
    );
    assert.equal(payload.commute.durationMinutes, 10);
    assert.equal(payload.email.unreadCount, 3);
    assert.equal(payload.calendar.count, 1);
    assert.equal(payload.fineapp.count, 1);
    assert.match(payload.summary, /Commute is 10 min/);
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
});

test("get_emails tool returns the same email payload as get_morning_brief", async () => {
  env.WEATHER_API_KEY = "weather-key";
  env.WEATHER_LOCATION = "Stellenbosch";
  env.GOOGLE_MAPS_API_KEY = "maps-key";
  env.GMAIL_CLIENT_ID = "client-id";
  env.GMAIL_CLIENT_SECRET = "client-secret";
  env.GMAIL_REFRESH_TOKEN = "refresh-token";
  env.GOOGLE_CALENDAR_ID = "primary";
  env.FINEAPP_ADMIN_TOKEN = "fineapp-token";
  env.FINEAPP_API_BASE_URL = "https://fineapp.example.com";
  env.HOME_ADDRESS = "Home";
  env.CAMPUS_ADDRESS = "Campus";
  env.TIMEZONE = "Africa/Johannesburg";

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.hostname === "api.weatherapi.com") {
      return jsonResponse({
        location: {
          name: "Stellenbosch",
          region: "Western Cape",
          country: "South Africa",
        },
        current: {
          temp_c: 24.1,
          feelslike_c: 25.6,
          humidity: 57,
          wind_kph: 17.6,
          is_day: 1,
          condition: {
            text: "Partly cloudy",
          },
        },
        forecast: {
          forecastday: [
            {
              date: "2026-03-25",
              day: {
                maxtemp_c: 23.3,
                mintemp_c: 13.9,
                avgtemp_c: 18.5,
                daily_chance_of_rain: 82,
                condition: {
                  text: "Patchy rain nearby",
                },
              },
            },
          ],
        },
      });
    }

    if (url.hostname === "routes.googleapis.com") {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.origin.address, "Home");
      return jsonResponse({
        routes: [
          {
            duration: "600s",
            staticDuration: "580s",
          },
        ],
      });
    }

    if (url.hostname === "oauth2.googleapis.com") {
      return jsonResponse({ access_token: "token-123" });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/messages" &&
      url.searchParams.get("maxResults") === "5" &&
      url.searchParams.get("q") === "is:unread"
    ) {
      return jsonResponse({
        messages: [
          {
            id: "m-1",
            threadId: "t-1",
          },
        ],
        resultSizeEstimate: 3,
      });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/messages/m-1"
    ) {
      return jsonResponse({
        id: "m-1",
        threadId: "t-1",
        snippet: "Snippet text",
        labelIds: ["UNREAD", "INBOX"],
        payload: {
          headers: [
            { name: "From", value: "Ada <ada@example.com>" },
            { name: "Subject", value: "Hello" },
            { name: "Date", value: "Wed, 25 Mar 2026 10:41:07 +0000" },
          ],
        },
      });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/labels/UNREAD"
    ) {
      return jsonResponse({
        id: "UNREAD",
        name: "UNREAD",
        messagesUnread: 3,
      });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/labels/IMPORTANT"
    ) {
      return jsonResponse({
        id: "IMPORTANT",
        name: "IMPORTANT",
        messagesUnread: 1,
      });
    }

    if (url.hostname === "www.googleapis.com") {
      return jsonResponse({
        items: [
          {
            id: "event-1",
            summary: "Connect Group",
            start: { dateTime: "2026-03-25T19:00:00+02:00" },
            end: { dateTime: "2026-03-25T20:00:00+02:00" },
          },
        ],
      });
    }

    if (url.hostname === "fineapp.example.com") {
      return jsonResponse({
        content: [
          {
            id: 1,
            actorUserId: 10,
            actorEmail: "user@example.com",
            actorRoles: "client",
            action: "BOOKING_MESSAGE_SENT",
            logMessage: "Message sent",
            targetEntityType: "BOOKING",
            targetEntityId: "booking-1",
            requestId: "req-1",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            success: true,
            httpStatus: null,
            errorCode: null,
            dataFromJson: null,
            dataToJson: null,
            createdAt: "2026-03-25T10:00:00.000Z",
          },
        ],
        totalPages: 1,
        totalElements: 1,
        size: 100,
        number: 0,
        numberOfElements: 1,
        last: true,
      });
    }

    throw new Error(`Unexpected fetch call: ${url.toString()}`);
  };

  const server = createServer();
  const client = new Client({
    name: "beacon-mcp-test-client",
    version: "1.0.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const [emailResult, morningBriefResult] = await Promise.all([
      client.callTool({
        name: "get_emails",
        arguments: {},
      }),
      client.callTool({
        name: "get_morning_brief",
        arguments: {},
      }),
    ]);

    assert.ok("content" in emailResult);
    assert.ok("content" in morningBriefResult);

    const emailPayload = JSON.parse(emailResult.content[0].text);
    const morningBriefPayload = JSON.parse(morningBriefResult.content[0].text);

    assert.deepEqual(emailPayload, morningBriefPayload.email);
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
});

test("get_emails tool surfaces provider errors with context", async () => {
  env.GMAIL_CLIENT_ID = "client-id";
  env.GMAIL_CLIENT_SECRET = "client-secret";
  env.GMAIL_REFRESH_TOKEN = "refresh-token";

  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  const server = createServer();
  const client = new Client({
    name: "beacon-mcp-test-client",
    version: "1.0.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.callTool({
      name: "get_emails",
      arguments: {},
    });

    assert.equal(result.isError, true);
    assert.equal(result.content[0].type, "text");
    assert.match(
      result.content[0].text,
      /Google OAuth token request failed: fetch failed/,
    );
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
});
