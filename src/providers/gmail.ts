import type { EmailsOutput } from "../schemas/gmail.js";
import type {
  FetchEmailsOptions,
  GmailLabelResponse,
  GmailListResponse,
  GmailMessageResponse,
} from "../types/gmail.js";
import { fetchGoogleAccessToken } from "./googleAuth.js";

function buildGmailQuery(options: FetchEmailsOptions): string {
  const queryParts = [
    options.query?.trim(),
    options.label ? `label:${options.label}` : null,
    options.unreadOnly ? "is:unread" : null,
  ].filter((value): value is string => Boolean(value));

  return queryParts.join(" ").trim();
}

function getHeaderValue(
  message: GmailMessageResponse,
  headerName: string,
): string | null {
  const header = message.payload?.headers?.find(
    (entry) => entry.name.toLowerCase() === headerName.toLowerCase(),
  );
  return header?.value ?? null;
}

async function fetchMessage(
  accessToken: string,
  id: string,
): Promise<GmailMessageResponse> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
  );
  url.searchParams.set("format", "metadata");
  url.searchParams.append("metadataHeaders", "From");
  url.searchParams.append("metadataHeaders", "Subject");
  url.searchParams.append("metadataHeaders", "Date");

  const response = await fetchGmail(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gmail message request failed: ${response.status} ${errorText}`,
    );
  }

  return (await response.json()) as GmailMessageResponse;
}

async function fetchCount(accessToken: string, query: string): Promise<number> {
  const url = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  url.searchParams.set("maxResults", "1");

  if (query) {
    url.searchParams.set("q", query);
  }

  const response = await fetchGmail(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gmail count request failed: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as GmailListResponse;
  return data.resultSizeEstimate ?? 0;
}

async function fetchLabelUnreadCount(
  accessToken: string,
  labelId: string,
): Promise<number> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`,
  );

  const response = await fetchGmail(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gmail label request failed: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as GmailLabelResponse;
  return data.messagesUnread ?? 0;
}

export async function fetchEmails(
  options: FetchEmailsOptions = {},
): Promise<EmailsOutput> {
  const accessToken = await fetchGoogleAccessToken();
  const query = buildGmailQuery(options);
  const url = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );

  url.searchParams.set("maxResults", String(options.maxResults ?? 5));

  if (query) {
    url.searchParams.set("q", query);
  }

  const response = await fetchGmail(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gmail list request failed: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as GmailListResponse;
  const messages = await Promise.all(
    (data.messages ?? []).map((message) =>
      fetchMessage(accessToken, message.id),
    ),
  );
  const [unreadCount, importantCount] = await Promise.all([
    fetchLabelUnreadCount(accessToken, "UNREAD"),
    fetchLabelUnreadCount(accessToken, "IMPORTANT"),
  ]);
  const estimatedCount = data.resultSizeEstimate ?? messages.length;
  const count =
    options.unreadOnly && !options.query && !options.label
      ? unreadCount
      : options.unreadOnly &&
          !options.query &&
          options.label?.toLowerCase() === "important"
        ? importantCount
        : estimatedCount;

  return {
    count,
    query,
    unreadCount,
    importantCount,
    emails: messages.map((message) => ({
      id: message.id,
      threadId: message.threadId,
      from: getHeaderValue(message, "From") ?? "Unknown sender",
      subject: getHeaderValue(message, "Subject") ?? "(no subject)",
      snippet: message.snippet ?? "",
      labels: message.labelIds ?? [],
      receivedAt: getHeaderValue(message, "Date"),
    })),
  };
}

async function fetchGmail(input: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gmail request failed: ${message}`, {
      cause: error,
    });
  }
}
