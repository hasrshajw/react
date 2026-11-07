/* ==========================================================================
   Data access layer.
   Every page loads server data through these async functions, so each page
   already has a real `loading` state (and therefore a skeleton).

   TODO(database): replace the bodies below with Supabase / API calls.
   Nothing else in the app needs to change.
   SIMULATED_LATENCY_MS only exists so the demo behaves like a network call.
   Set it to 0 when the real database is connected.
   ========================================================================== */
import { demoCategories, demoTemplates, getDemoInvitations } from "./demoData";
import { INITIAL_ENQUIRIES } from "./dashboardData";
import type { Enquiry, InvitationRow } from "../types/dashboard";
import type { Category, Template } from "../types/invitation";

export const SIMULATED_LATENCY_MS = 450;

function respond<T>(read: () => T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      try { resolve(read()); } catch (e) { reject(e); }
    }, ms);
  });
}

export interface AccountUser { name: string; email: string; role: string }
export interface Plan { name: string; status: "trial" | "active" | "past_due"; trialDaysLeft?: number }
export interface Account { user: AccountUser; plan: Plan }

export const fetchAccount = () =>
  respond<Account>(() => ({
    user: { name: "Harsha Vardhan", email: "schedy.in@gmail.com", role: "Administrator" },
    plan: { name: "Pro", status: "trial", trialDaysLeft: 12 },
  }), 350);

export const fetchTemplates = () =>
  respond<{ templates: Template[]; categories: Category[] }>(() => ({ templates: demoTemplates, categories: demoCategories }));

export const fetchInvitation = (id: string) =>
  respond<InvitationRow | null>(() => getDemoInvitations().find((x) => x.id === id) ?? null, 400);

export const fetchEnquiries = () => respond<Enquiry[]>(() => INITIAL_ENQUIRIES, 500);
