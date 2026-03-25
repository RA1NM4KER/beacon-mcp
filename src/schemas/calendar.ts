import { z } from "zod";

export const CalendarEventsInputSchema = z.object({
  date: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  maxResults: z.number().int().positive().max(50).optional(),
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  status: z.string().nullable(),
  htmlLink: z.string().nullable(),
  allDay: z.boolean(),
});

export const CalendarEventsOutputSchema = z.object({
  count: z.number(),
  date: z.string().nullable(),
  dateFrom: z.string(),
  dateTo: z.string(),
  events: z.array(CalendarEventSchema),
});

export type CalendarEventsOutput = z.infer<typeof CalendarEventsOutputSchema>;
