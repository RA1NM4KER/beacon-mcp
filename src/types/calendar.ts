export type FetchCalendarEventsOptions = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  maxResults?: number;
};

export type GoogleCalendarEventsResponse = {
  items?: Array<{
    id: string;
    summary?: string;
    description?: string;
    location?: string;
    status?: string;
    htmlLink?: string;
    start?: {
      date?: string;
      dateTime?: string;
    };
    end?: {
      date?: string;
      dateTime?: string;
    };
  }>;
};
