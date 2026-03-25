import type { z } from "zod";

import type { FetchEmailsOptions } from "../types/gmail.js";
import type { EmailsInputSchema } from "../schemas/gmail.js";
import type { MorningBriefInputSchema } from "../schemas/morningBrief.js";

type EmailsToolInput = z.infer<typeof EmailsInputSchema>;
type MorningBriefInput = z.infer<typeof MorningBriefInputSchema>;

const DEFAULT_EMAIL_MAX_RESULTS = 5;

export function buildEmailFetchOptions(
  input: EmailsToolInput | MorningBriefInput,
): FetchEmailsOptions {
  const maxResults =
    "emailMaxResults" in input
      ? (input.emailMaxResults ?? DEFAULT_EMAIL_MAX_RESULTS)
      : (input.maxResults ?? DEFAULT_EMAIL_MAX_RESULTS);

  const query = "emailQuery" in input ? input.emailQuery : input.query;
  const label = "emailLabel" in input ? input.emailLabel : input.label;
  const unreadOnly =
    "emailUnreadOnly" in input
      ? (input.emailUnreadOnly ?? true)
      : (input.unreadOnly ?? true);

  return {
    query,
    label,
    unreadOnly,
    maxResults,
  };
}
