export type FetchFineappAuditOptions = {
  page?: number;
  size?: number;
  success?: boolean;
  actorEmail?: string;
  action?: string;
  targetEntityType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type FineappAuditApiResponse = {
  content: FineappAuditApiItem[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
  last: boolean;
};

export type FineappAuditApiItem = {
  id: number;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRoles: string | null;
  action: string;
  logMessage: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  httpStatus: number | null;
  errorCode: string | null;
  dataFromJson: string | null;
  dataToJson: string | null;
  createdAt: string;
};
