import type { FetchEmailsOptions } from "../types/gmail.js";

const DEFAULT_EMAIL_MAX_RESULTS = 5;
type EmailOptionsInput = {
  query?: string;
  label?: string;
  unreadOnly?: boolean;
  maxResults?: number;
  emailQuery?: string;
  emailLabel?: string;
  emailUnreadOnly?: boolean;
  emailMaxResults?: number;
};

export function buildEmailFetchOptions(input: EmailOptionsInput): FetchEmailsOptions {
  const maxResults =
    input.emailMaxResults ?? input.maxResults ?? DEFAULT_EMAIL_MAX_RESULTS;
  const query = input.emailQuery ?? input.query;
  const label = input.emailLabel ?? input.label;
  const unreadOnly = input.emailUnreadOnly ?? input.unreadOnly ?? true;

  return {
    query,
    label,
    unreadOnly,
    maxResults,
  };
}
