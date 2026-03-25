import { z } from "zod";

export const WeatherInputSchema = z.object({
  location: z.string().optional(),
  date: z.string().optional(),
  days: z.number().int().positive().max(10).optional(),
  hour: z.number().int().min(0).max(23).optional(),
});

export const WeatherCurrentSchema = z.object({
  temperatureC: z.number(),
  feelsLikeC: z.number(),
  condition: z.string(),
  humidity: z.number(),
  windKph: z.number(),
  isDay: z.boolean(),
});

export const WeatherHourSchema = z.object({
  time: z.string(),
  temperatureC: z.number(),
  feelsLikeC: z.number(),
  condition: z.string(),
  rainChancePercent: z.number(),
  humidity: z.number(),
  windKph: z.number(),
});

export const WeatherForecastDaySchema = z.object({
  date: z.string(),
  condition: z.string(),
  maxTempC: z.number(),
  minTempC: z.number(),
  avgTempC: z.number(),
  rainChancePercent: z.number(),
  sunrise: z.string().nullable(),
  sunset: z.string().nullable(),
});

export const WeatherOutputSchema = z.object({
  location: z.string(),
  temperatureC: z.number(),
  condition: z.string(),
  rainChance: z.string(),
  requestedDate: z.string().nullable(),
  requestedHour: z.number().nullable(),
  current: WeatherCurrentSchema,
  selectedHour: WeatherHourSchema.nullable(),
  forecastDays: z.array(WeatherForecastDaySchema),
});

export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;
