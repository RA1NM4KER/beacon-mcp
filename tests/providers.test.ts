import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { fetchCalendarEvents } from "../src/providers/calendar.js";
import { fetchCommute } from "../src/providers/commute.js";
import { fetchFineappAudit } from "../src/providers/fineappAudit.js";
import { fetchEmails } from "../src/providers/gmail.js";
import { fetchGoogleAccessToken } from "../src/providers/googleAuth.js";
import { fetchWeather } from "../src/providers/weather.js";
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

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    status: 200,
    ...init,
  });
}

function useFetchMock(
  handler: (
    input: string | URL,
    init?: RequestInit,
  ) => Response | Promise<Response>,
): void {
  globalThis.fetch = async (input, init) =>
    handler(input as string | URL, init);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(env, originalEnv);
});

test("fetchGoogleAccessToken returns an access token", async () => {
  env.GMAIL_CLIENT_ID = "client-id";
  env.GMAIL_CLIENT_SECRET = "client-secret";
  env.GMAIL_REFRESH_TOKEN = "refresh-token";

  useFetchMock((input, init) => {
    assert.equal(String(input), "https://oauth2.googleapis.com/token");
    assert.equal(init?.method, "POST");
    return jsonResponse({ access_token: "token-123" });
  });

  assert.equal(await fetchGoogleAccessToken(), "token-123");
});

test("fetchGoogleAccessToken throws when credentials are missing", async () => {
  env.GMAIL_CLIENT_ID = undefined;
  env.GMAIL_CLIENT_SECRET = undefined;
  env.GMAIL_REFRESH_TOKEN = undefined;

  await assert.rejects(
    () => fetchGoogleAccessToken(),
    /Google OAuth client credentials are not fully configured/,
  );
});

test("fetchWeather normalizes the weather API response", async () => {
  env.WEATHER_API_KEY = "weather-key";
  env.WEATHER_LOCATION = "Stellenbosch";

  useFetchMock((input) => {
    const url = new URL(String(input));

    assert.equal(url.hostname, "api.weatherapi.com");
    assert.equal(url.searchParams.get("key"), "weather-key");
    assert.equal(url.searchParams.get("q"), "Stellenbosch");

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
            astro: {
              sunrise: "06:51 AM",
              sunset: "06:49 PM",
            },
            hour: [
              {
                time: "2026-03-25 19:00",
                temp_c: 20.5,
                feelslike_c: 20.1,
                chance_of_rain: 30,
                humidity: 66,
                wind_kph: 12.4,
                condition: {
                  text: "Clear",
                },
              },
            ],
          },
        ],
      },
    });
  });

  const result = await fetchWeather({ hour: 19 });

  assert.equal(result.location, "Stellenbosch, Western Cape, South Africa");
  assert.equal(result.temperatureC, 20.5);
  assert.equal(result.condition, "Clear");
  assert.equal(result.rainChance, "Moderate");
  assert.equal(result.selectedHour?.time, "2026-03-25 19:00");
  assert.equal(result.forecastDays[0].rainChancePercent, 82);
});

test("fetchWeather surfaces HTTP errors", async () => {
  env.WEATHER_API_KEY = "weather-key";

  useFetchMock(() =>
    textResponse("bad request", {
      status: 400,
      statusText: "Bad Request",
    }),
  );

  await assert.rejects(
    () => fetchWeather(),
    /Weather API request failed: 400 bad request/,
  );
});

test("fetchCommute normalizes route durations and departure time", async () => {
  env.GOOGLE_MAPS_API_KEY = "maps-key";
  env.TIMEZONE = "Africa/Johannesburg";

  useFetchMock((_input, init) => {
    const body = JSON.parse(String(init?.body));

    assert.equal(body.origin.address, "Home");
    assert.equal(body.destination.address, "Campus");
    assert.equal(body.departureTime, "2026-03-25T18:00:00.000Z");

    return jsonResponse({
      routes: [
        {
          duration: "900s",
          staticDuration: "750s",
        },
      ],
    });
  });

  const result = await fetchCommute("Home", "Campus", "2026-03-25 8pm");

  assert.deepEqual(result, {
    from: "Home",
    to: "Campus",
    durationMinutes: 15,
    trafficLevel: "Moderate",
    departureAt: "2026-03-25T18:00:00.000Z",
    leaveBy: null,
  });
});

test("fetchCommute rejects invalid departure strings", async () => {
  env.GOOGLE_MAPS_API_KEY = "maps-key";

  await assert.rejects(
    () => fetchCommute("Home", "Campus", "next week maybe"),
    /Unsupported departureAt format/,
  );
});

test("fetchEmails normalizes Gmail list and message results", async () => {
  env.GMAIL_CLIENT_ID = "client-id";
  env.GMAIL_CLIENT_SECRET = "client-secret";
  env.GMAIL_REFRESH_TOKEN = "refresh-token";

  useFetchMock((input) => {
    const url = new URL(String(input));

    if (url.hostname === "oauth2.googleapis.com") {
      return jsonResponse({ access_token: "token-123" });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/messages" &&
      url.searchParams.get("maxResults") === "5"
    ) {
      return jsonResponse({
        messages: [{ id: "m-1", threadId: "t-1" }],
        resultSizeEstimate: 7,
      });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/labels/UNREAD"
    ) {
      return jsonResponse({
        id: "UNREAD",
        name: "UNREAD",
        messagesUnread: 12,
      });
    }

    if (
      url.hostname === "gmail.googleapis.com" &&
      url.pathname === "/gmail/v1/users/me/labels/IMPORTANT"
    ) {
      return jsonResponse({
        id: "IMPORTANT",
        name: "IMPORTANT",
        messagesUnread: 4,
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

    throw new Error(`Unexpected fetch call: ${url.toString()}`);
  });

  const result = await fetchEmails({ unreadOnly: true, maxResults: 5 });

  assert.equal(result.query, "is:unread");
  assert.equal(result.count, 12);
  assert.equal(result.unreadCount, 12);
  assert.equal(result.importantCount, 4);
  assert.deepEqual(result.emails[0], {
    id: "m-1",
    threadId: "t-1",
    from: "Ada <ada@example.com>",
    subject: "Hello",
    snippet: "Snippet text",
    labels: ["UNREAD", "INBOX"],
    receivedAt: "Wed, 25 Mar 2026 10:41:07 +0000",
  });
});

test("fetchCalendarEvents normalizes timed and all-day events", async () => {
  env.GMAIL_CLIENT_ID = "client-id";
  env.GMAIL_CLIENT_SECRET = "client-secret";
  env.GMAIL_REFRESH_TOKEN = "refresh-token";
  env.GOOGLE_CALENDAR_ID = "primary";
  env.TIMEZONE = "Africa/Johannesburg";

  useFetchMock((input) => {
    const url = new URL(String(input));

    if (url.hostname === "oauth2.googleapis.com") {
      return jsonResponse({ access_token: "token-123" });
    }

    if (url.hostname === "www.googleapis.com") {
      assert.equal(url.pathname, "/calendar/v3/calendars/primary/events");
      assert.equal(url.searchParams.get("maxResults"), "2");

      return jsonResponse({
        items: [
          {
            id: "event-1",
            summary: "Connect Group",
            start: { dateTime: "2026-03-25T19:00:00+02:00" },
            end: { dateTime: "2026-03-25T20:00:00+02:00" },
          },
          {
            id: "event-2",
            start: { date: "2026-03-26" },
            end: { date: "2026-03-27" },
          },
        ],
      });
    }

    throw new Error(`Unexpected fetch call: ${url.toString()}`);
  });

  const result = await fetchCalendarEvents({
    date: "2026-03-25",
    maxResults: 2,
  });

  assert.equal(result.count, 2);
  assert.equal(result.date, "2026-03-25");
  assert.equal(result.events[0].title, "Connect Group");
  assert.equal(result.events[1].title, "Untitled event");
  assert.equal(result.events[1].allDay, true);
});

test("fetchFineappAudit paginates, filters, and normalizes summaries", async () => {
  env.FINEAPP_ADMIN_TOKEN = "fineapp-token";
  env.FINEAPP_API_BASE_URL = "https://fineapp.example.com";
  env.TIMEZONE = "Africa/Johannesburg";

  useFetchMock((input) => {
    const url = new URL(String(input));
    const page = url.searchParams.get("page");

    if (page === "0") {
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
        totalPages: 2,
        totalElements: 2,
        size: 100,
        number: 0,
        numberOfElements: 1,
        last: false,
      });
    }

    if (page === "1") {
      return jsonResponse({
        content: [
          {
            id: 2,
            actorUserId: null,
            actorEmail: null,
            actorRoles: null,
            action: "PAYMENT_ITN",
            logMessage: "ITN OK",
            targetEntityType: "BOOKING",
            targetEntityId: "booking-2",
            requestId: "req-2",
            ipAddress: null,
            userAgent: null,
            success: false,
            httpStatus: 500,
            errorCode: "ERR",
            dataFromJson: null,
            dataToJson: null,
            createdAt: "2026-03-24T10:00:00.000Z",
          },
        ],
        totalPages: 2,
        totalElements: 2,
        size: 100,
        number: 1,
        numberOfElements: 1,
        last: true,
      });
    }

    throw new Error(`Unexpected fetch call: ${url.toString()}`);
  });

  const result = await fetchFineappAudit({
    success: true,
    actorEmail: "user@",
    dateFrom: "2026-03-25",
  });

  assert.equal(result.count, 1);
  assert.equal(result.totalCount, 1);
  assert.equal(
    result.items[0].summary,
    "user@example.com: Message sent on BOOKING booking-1 (success)",
  );
});
