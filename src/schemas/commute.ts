import { z } from "zod";

export const CommuteInputSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  departureAt: z.string().optional(),
});

export const CommuteOutputSchema = z.object({
  from: z.string(),
  to: z.string(),
  durationMinutes: z.number(),
  trafficLevel: z.string(),
  departureAt: z.string().nullable(),
  leaveBy: z.string().nullable(),
});

export type CommuteOutput = z.infer<typeof CommuteOutputSchema>;
