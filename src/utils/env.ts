import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  WEATHER_API_KEY: z.string().optional(),
  WEATHER_LOCATION: z.string().default("Stellenbosch"),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  FINEAPP_API_BASE_URL: z
    .string()
    .default("https://fineapple-api-production.up.railway.app"),
  FINEAPP_ADMIN_TOKEN: z.string().optional(),
  HOME_ADDRESS: z.string().default("Home"),
  CAMPUS_ADDRESS: z.string().default("Campus"),
  TIMEZONE: z.string().default("Africa/Johannesburg"),
});

export const env = EnvSchema.parse(process.env);
