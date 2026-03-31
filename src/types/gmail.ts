export type FetchEmailsOptions = {
  query?: string;
  label?: string;
  unreadOnly?: boolean;
  maxResults?: number;
};

export type GmailListResponse = {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  resultSizeEstimate?: number;
};

export type GmailMessageResponse = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{
      name: string;
      value: string;
    }>;
  };
};

export type GmailLabelResponse = {
  id: string;
  name: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};
