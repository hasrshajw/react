import type { InvitationData, Template } from "./invitation";

/** Invitation record as returned by the API. */
export interface InvitationRow {
  id: string;
  groom_name?: string;
  bride_name?: string;
  event_date?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  views?: number;
  template_id?: string | number | null;
  template_name?: string;
  /** Linked client login (verified email). Top-level column, not inside details. */
  client_email?: string | null;
  /** The form data as saved. The same shape the editor and the compiler use (Partial because old rows may lack newer fields). */
  details?: Partial<InvitationData>;
}

/** A template plus the optional fields a real API may add (thumbnail, alternate name/html keys). */
export interface TemplateRecord extends Template {
  title?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  image?: string;
  preview_image?: string;
}


export type EnquiryStatus = "new" | "followup" | "called" | "cancelled";
/** Tabs of the enquiries panel: a status, or everything. */
export type EnquiryTab = EnquiryStatus | "all";

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
  status: EnquiryStatus;
  note: string;
  followUpDate: string;
  history: { status: EnquiryStatus; at: string }[];
}

export interface TrashItem { row: InvitationRow; at: number }

/** Map of invitation id -> published flag. A missing id means "published". */
export type PublishMap = Record<string, boolean>;
/** Map of invitation id -> time it was moved to the trash (ms). */
export type DeletedMap = Record<string, number>;

export type Notify = (msg: string, undo?: () => void) => void;

export type TableFilter = "all" | "published" | "draft" | "draftSoon" | "noViews";
export type SortKey = "recent" | "date" | "views";
