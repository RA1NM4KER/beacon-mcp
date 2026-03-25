import { z } from "zod";

export const EmailsInputSchema = z.object({
  query: z.string().optional(),
  label: z.string().optional(),
  unreadOnly: z.boolean().optional(),
  maxResults: z.number().int().positive().max(20).optional(),
});

export const EmailItemSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
  labels: z.array(z.string()),
  receivedAt: z.string().nullable(),
});

export const EmailsOutputSchema = z.object({
  count: z.number(),
  query: z.string(),
  unreadCount: z.number(),
  importantCount: z.number(),
  emails: z.array(EmailItemSchema),
});

export type EmailsOutput = z.infer<typeof EmailsOutputSchema>;
