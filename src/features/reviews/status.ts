import type { RequestStatus } from "../../lib/api";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  superseded: "Superseded",
};

/** Chip class (defined in dashboard.css) used for each request status. */
export const STATUS_CHIP: Record<RequestStatus, string> = {
  pending: "pending",
  approved: "ok",
  rejected: "enq-cancelled",
  withdrawn: "draft",
  superseded: "draft",
};
