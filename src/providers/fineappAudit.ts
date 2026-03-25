import { env } from "../utils/env.js";
import {
  FineappAuditOutputSchema,
  type AuditItem,
  type FineappAuditOutput,
} from "../schemas/fineappAudit.js";
import type {
  FetchFineappAuditOptions,
  FineappAuditApiItem,
  FineappAuditApiResponse,
} from "../types/fineappAudit.js";
import { parseFlexibleDateTime } from "../utils/time.js";

export async function fetchFineappAudit(
  options: FetchFineappAuditOptions = {},
): Promise<FineappAuditOutput> {
  if (!env.FINEAPP_ADMIN_TOKEN) {
    throw new Error("Missing FINEAPP_ADMIN_TOKEN");
  }

  const page = options.page ?? 0;
  const size = options.size ?? 25;
  const filters = {
    success: options.success ?? null,
    actorEmail: options.actorEmail ?? null,
    action: options.action ?? null,
    targetEntityType: options.targetEntityType ?? null,
    dateFrom: options.dateFrom
      ? parseFlexibleDateTime(options.dateFrom, env.TIMEZONE, {
          hour: 0,
          minute: 0,
        })
      : null,
    dateTo: options.dateTo
      ? parseFlexibleDateTime(options.dateTo, env.TIMEZONE, {
          hour: 23,
          minute: 59,
        })
      : null,
  };
  const allItems: AuditItem[] = [];

  for (let sourcePage = 0; ; sourcePage += 1) {
    const raw = await fetchAuditPage(sourcePage, 100);
    allItems.push(...raw.content.map(normalizeAuditItem));

    if (raw.last) {
      break;
    }
  }

  const filteredItems = allItems.filter((item) =>
    matchesAuditFilters(item, filters),
  );
  const startIndex = page * size;
  const pagedItems = filteredItems.slice(startIndex, startIndex + size);
  const totalPages =
    filteredItems.length === 0 ? 0 : Math.ceil(filteredItems.length / size);
  const output = {
    count: pagedItems.length,
    totalCount: filteredItems.length,
    page,
    size,
    totalPages,
    hasMore: startIndex + size < filteredItems.length,
    filters,
    items: pagedItems,
  };

  return FineappAuditOutputSchema.parse(output);
}

async function fetchAuditPage(
  page: number,
  size: number,
): Promise<FineappAuditApiResponse> {
  const url = new URL("/api/admin/audit-logs", env.FINEAPP_API_BASE_URL);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${env.FINEAPP_ADMIN_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `FineApp audit request failed with ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as FineappAuditApiResponse;
}

function normalizeAuditItem(item: FineappAuditApiItem): AuditItem {
  return {
    id: item.id,
    actorUserId: item.actorUserId,
    actorEmail: item.actorEmail,
    actorRoles: item.actorRoles,
    action: item.action,
    logMessage: item.logMessage,
    targetEntityType: item.targetEntityType,
    targetEntityId: item.targetEntityId,
    requestId: item.requestId,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    success: item.success,
    httpStatus: item.httpStatus,
    errorCode: item.errorCode,
    dataFromJson: item.dataFromJson,
    dataToJson: item.dataToJson,
    createdAt: item.createdAt,
    summary: buildAuditSummary(item),
  };
}

function buildAuditSummary(item: FineappAuditApiItem) {
  const actor = item.actorEmail ?? "system";
  const message = item.logMessage ?? item.action;
  const target =
    item.targetEntityType && item.targetEntityId
      ? ` on ${item.targetEntityType} ${item.targetEntityId}`
      : "";
  const outcome = item.success ? "success" : "failed";

  return `${actor}: ${message}${target} (${outcome})`;
}

function matchesAuditFilters(
  item: AuditItem,
  filters: {
    success: boolean | null;
    actorEmail: string | null;
    action: string | null;
    targetEntityType: string | null;
    dateFrom: string | null;
    dateTo: string | null;
  },
) {
  if (filters.success !== null && item.success !== filters.success) {
    return false;
  }

  if (
    filters.actorEmail &&
    !(item.actorEmail ?? "")
      .toLowerCase()
      .includes(filters.actorEmail.toLowerCase())
  ) {
    return false;
  }

  if (
    filters.action &&
    !item.action.toLowerCase().includes(filters.action.toLowerCase())
  ) {
    return false;
  }

  if (
    filters.targetEntityType &&
    !(item.targetEntityType ?? "")
      .toLowerCase()
      .includes(filters.targetEntityType.toLowerCase())
  ) {
    return false;
  }

  if (filters.dateFrom && item.createdAt < filters.dateFrom) {
    return false;
  }

  return !(filters.dateTo && item.createdAt > filters.dateTo);
}
