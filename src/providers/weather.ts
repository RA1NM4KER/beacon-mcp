import type { WeatherOutput } from "../schemas/weather.js";
import type {
  FetchWeatherOptions,
  WeatherApiResponse,
} from "../types/weather.js";
import { env } from "../utils/env.js";
import {
  formatLocalDate,
  localDateFromNow,
  parseLocalDate,
} from "../utils/time.js";

function formatLocation(response: WeatherApiResponse): string {
  const parts = [
    response.location.name,
    response.location.region,
    response.location.country,
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  return parts.join(", ");
}

function formatRainChance(chance: number | undefined): string {
  if (chance === undefined) {
    return "Unknown";
  }

  if (chance < 20) {
    return "Low";
  }

  if (chance < 60) {
    return "Moderate";
  }

  return "High";
}

function resolveForecastDays(
  date: string | undefined,
  days: number | undefined,
): number {
  if (date) {
    const targetDate = parseLocalDate(date);

    if (!targetDate) {
      throw new Error(
        `Unsupported weather date format: ${date}. Use YYYY-MM-DD.`,
      );
    }

    const today = localDateFromNow(env.TIMEZONE);
    const targetUtc = Date.UTC(
      targetDate.year,
      targetDate.month - 1,
      targetDate.day,
      12,
      0,
      0,
    );
    const todayUtc = Date.UTC(today.year, today.month - 1, today.day, 12, 0, 0);
    const diffDays = Math.round((targetUtc - todayUtc) / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
      throw new Error(`Weather date ${date} is in the past.`);
    }

    return Math.min(10, diffDays + 1);
  }

  return days ?? 1;
}

function resolveRequestedDate(
  date: string | undefined,
  days: number | undefined,
): string | null {
  if (date) {
    return date;
  }

  if (!days || days === 1) {
    return formatLocalDate(localDateFromNow(env.TIMEZONE));
  }

  return null;
}

function normalizeSelectedHour(
  data: WeatherApiResponse,
  requestedDate: string | null,
  requestedHour: number | undefined,
) {
  if (requestedHour === undefined) {
    return null;
  }

  const day =
    data.forecast.forecastday.find((entry) => entry.date === requestedDate) ??
    data.forecast.forecastday[0];
  const hour = day?.hour?.find((entry) => {
    const hourValue = Number.parseInt(entry.time.slice(-5, -3), 10);
    return hourValue === requestedHour;
  });

  if (!hour) {
    return null;
  }

  return {
    time: hour.time,
    temperatureC: hour.temp_c,
    feelsLikeC: hour.feelslike_c,
    condition: hour.condition.text,
    rainChancePercent: hour.chance_of_rain ?? 0,
    humidity: hour.humidity,
    windKph: hour.wind_kph,
  };
}

function normalizeForecastDays(data: WeatherApiResponse) {
  return data.forecast.forecastday.map((entry) => ({
    date: entry.date,
    condition: entry.day.condition.text,
    maxTempC: entry.day.maxtemp_c,
    minTempC: entry.day.mintemp_c,
    avgTempC: entry.day.avgtemp_c,
    rainChancePercent: entry.day.daily_chance_of_rain ?? 0,
    sunrise: entry.astro?.sunrise ?? null,
    sunset: entry.astro?.sunset ?? null,
  }));
}

export async function fetchWeather(
  options: FetchWeatherOptions = {},
): Promise<WeatherOutput> {
  const location = options.location ?? env.WEATHER_LOCATION;

  if (!env.WEATHER_API_KEY) {
    throw new Error("WEATHER_API_KEY is not configured");
  }

  const forecastDays = resolveForecastDays(options.date, options.days);
  const requestedDate = resolveRequestedDate(options.date, options.days);

  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", env.WEATHER_API_KEY);
  url.searchParams.set("q", location);
  url.searchParams.set("days", String(forecastDays));
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Weather API request failed: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as WeatherApiResponse;
  const normalizedForecastDays = normalizeForecastDays(data);
  const selectedForecastDay = requestedDate
    ? (normalizedForecastDays.find((entry) => entry.date === requestedDate) ??
      normalizedForecastDays[0])
    : normalizedForecastDays[0];
  const selectedHour = normalizeSelectedHour(
    data,
    selectedForecastDay?.date ?? requestedDate,
    options.hour,
  );

  return {
    location: formatLocation(data),
    temperatureC: selectedHour?.temperatureC ?? data.current.temp_c,
    condition:
      selectedHour?.condition ??
      selectedForecastDay?.condition ??
      data.current.condition.text,
    rainChance: formatRainChance(
      selectedHour?.rainChancePercent ?? selectedForecastDay?.rainChancePercent,
    ),
    requestedDate: selectedForecastDay?.date ?? requestedDate,
    requestedHour: options.hour ?? null,
    current: {
      temperatureC: data.current.temp_c,
      feelsLikeC: data.current.feelslike_c,
      condition: data.current.condition.text,
      humidity: data.current.humidity,
      windKph: data.current.wind_kph,
      isDay: data.current.is_day === 1,
    },
    selectedHour,
    forecastDays: normalizedForecastDays,
  };
}
