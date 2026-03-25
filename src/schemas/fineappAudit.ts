import { z } from "zod";

export const FineappAuditInputSchema = z.object({
  page: z.number().int().min(0).optional(),
  size: z.number().int().positive().max(100).optional(),
  success: z.boolean().optional(),
  actorEmail: z.string().optional(),
  action: z.string().optional(),
  targetEntityType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const AuditItemSchema = z.object({
  id: z.number(),
  actorUserId: z.number().nullable(),
  actorEmail: z.string().nullable(),
  actorRoles: z.string().nullable(),
  action: z.string(),
  logMessage: z.string().nullable(),
  targetEntityType: z.string().nullable(),
  targetEntityId: z.string().nullable(),
  requestId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  success: z.boolean(),
  httpStatus: z.number().nullable(),
  errorCode: z.string().nullable(),
  dataFromJson: z.string().nullable(),
  dataToJson: z.string().nullable(),
  createdAt: z.string(),
  summary: z.string(),
});

export const FineappAuditOutputSchema = z.object({
  count: z.number(),
  totalCount: z.number(),
  page: z.number(),
  size: z.number(),
  totalPages: z.number(),
  hasMore: z.boolean(),
  filters: z.object({
    success: z.boolean().nullable(),
    actorEmail: z.string().nullable(),
    action: z.string().nullable(),
    targetEntityType: z.string().nullable(),
    dateFrom: z.string().nullable(),
    dateTo: z.string().nullable(),
  }),
  items: z.array(AuditItemSchema),
});

export type AuditItem = z.infer<typeof AuditItemSchema>;
export type FineappAuditOutput = z.infer<typeof FineappAuditOutputSchema>;
