import { describe, expect, it } from "vitest";
import { initial } from "../features/create/constants";
import { DEFAULT_INVITE_MESSAGE_TE, inviteTextTe } from "./inviteText";
import type { InvitationData } from "../types/invitation";

const d = (o: Partial<InvitationData>): InvitationData => ({ ...initial, surnameTe: "హర్ష వర్ధన్", groomTe: "రవి", brideTe: "ప్రియ", groomFatherTe: "రామారావు", brideFatherTe: "కృష్ణ", ...o });

describe("invitation text", () => {
  it("by default reads exactly like the old template: surname + కుటుంబము వారి + standard message", () => {
    expect(inviteTextTe(d({}))).toBe(`హర్ష వర్ధన్ కుటుంబము వారి ${DEFAULT_INVITE_MESSAGE_TE}`);
  });
  it("groom's and bride's family use the father's name, or the person's own name", () => {
    expect(inviteTextTe(d({ inviterMode: "groom" }))).toMatch(/^రామారావు కుటుంబము వారి /);
    expect(inviteTextTe(d({ inviterMode: "bride", brideFatherTe: "" }))).toMatch(/^ప్రియ కుటుంబము వారి /);
  });
  it("both families are joined and the word becomes plural", () => {
    expect(inviteTextTe(d({ inviterMode: "both" }))).toMatch(/^రామారావు & కృష్ణ కుటుంబముల వారి /);
  });
  it("a custom name is used as typed (Telugu first, English as a fallback)", () => {
    expect(inviteTextTe(d({ inviterMode: "custom", inviterTe: "మిత్రులు" }))).toMatch(/^మిత్రులు కుటుంబము వారి /);
    expect(inviteTextTe(d({ inviterMode: "custom", inviterEn: "Rao" }))).toMatch(/^Rao కుటుంబము వారి /);
  });
  it("an edited message replaces the standard one; no name means message only", () => {
    expect(inviteTextTe(d({ inviteMessageTe: "మా పెళ్ళికి రండి." }))).toBe("హర్ష వర్ధన్ కుటుంబము వారి మా పెళ్ళికి రండి.");
    expect(inviteTextTe(d({ surnameTe: "" }))).toBe(DEFAULT_INVITE_MESSAGE_TE);
  });
  it("an unknown mode falls back to the surname", () => {
    expect(inviteTextTe(d({ inviterMode: "nonsense" }))).toMatch(/^హర్ష వర్ధన్ /);
  });
});
