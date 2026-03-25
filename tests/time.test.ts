import assert from "node:assert/strict";
import test from "node:test";

import {
  formatLocalDate,
  parseFlexibleDateTime,
  parseLocalDate,
  resolveDateRange,
  shiftLocalDate,
  zonedDateTimeToUtcIso,
} from "../src/utils/time.js";

test("parseLocalDate accepts YYYY-MM-DD and rejects other formats", () => {
  assert.deepEqual(parseLocalDate("2026-03-25"), {
    year: 2026,
    month: 3,
    day: 25,
  });
  assert.equal(parseLocalDate("25-03-2026"), null);
});

test("shiftLocalDate handles month boundaries", () => {
  assert.deepEqual(shiftLocalDate({ year: 2026, month: 1, day: 31 }, 1), {
    year: 2026,
    month: 2,
    day: 1,
  });
});

test("zonedDateTimeToUtcIso converts Africa/Johannesburg local time to UTC", () => {
  assert.equal(
    zonedDateTimeToUtcIso(
      { year: 2026, month: 3, day: 25, hour: 19, minute: 0 },
      "Africa/Johannesburg",
    ),
    "2026-03-25T17:00:00.000Z",
  );
});

test("parseFlexibleDateTime supports local date and local datetime inputs", () => {
  assert.equal(
    parseFlexibleDateTime("2026-03-25", "Africa/Johannesburg"),
    "2026-03-24T22:00:00.000Z",
  );
  assert.equal(
    parseFlexibleDateTime("2026-03-25 19:30", "Africa/Johannesburg"),
    "2026-03-25T17:30:00.000Z",
  );
});

test("parseFlexibleDateTime preserves offset-aware timestamps", () => {
  assert.equal(
    parseFlexibleDateTime("2026-03-25T17:00:00Z", "Africa/Johannesburg"),
    "2026-03-25T17:00:00.000Z",
  );
});

test("parseFlexibleDateTime rejects unsupported formats", () => {
  assert.throws(
    () => parseFlexibleDateTime("03/25/2026", "Africa/Johannesburg"),
    /Unsupported date\/time format/,
  );
});

test("resolveDateRange expands a single local date into a UTC day range", () => {
  assert.deepEqual(
    resolveDateRange({ date: "2026-03-25" }, "Africa/Johannesburg"),
    {
      startIso: "2026-03-24T22:00:00.000Z",
      endIso: "2026-03-25T22:00:00.000Z",
      date: "2026-03-25",
    },
  );
});

test("resolveDateRange uses explicit range bounds when provided", () => {
  assert.deepEqual(
    resolveDateRange(
      {
        dateFrom: "2026-03-25",
        dateTo: "2026-03-26 18:15",
      },
      "Africa/Johannesburg",
    ),
    {
      startIso: "2026-03-24T22:00:00.000Z",
      endIso: "2026-03-26T16:15:00.000Z",
      date: null,
    },
  );
});

test("formatLocalDate zero-pads fields", () => {
  assert.equal(formatLocalDate({ year: 2026, month: 3, day: 5 }), "2026-03-05");
});
