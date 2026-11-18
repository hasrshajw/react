import { describe, expect, it } from "vitest";
import { initial } from "../features/create/constants";
import { DEFAULT_INVITE_MESSAGE_TE, inviteMessageTe, inviterLinesTe } from "./inviteText";
import type { InvitationData } from "../types/invitation";

const d = (o: Partial<InvitationData>): InvitationData => ({ ...initial, surnameTe: "హర్ష వర్ధన్", groomTe: "రవి", brideTe: "ప్రియ", groomFatherTe: "రామారావు", groomMotherTe: "సీత", brideFatherTe: "కృష్ణ", brideMotherTe: "లక్ష్మి", ...o });

describe("invitation text", () => {
  it("the message is the standard text unless edited", () => {
    expect(inviteMessageTe(d({}))).toBe(DEFAULT_INVITE_MESSAGE_TE);
    expect(inviteMessageTe(d({ inviteMessageTe: " మా పెళ్ళికి రండి. " }))).toBe("మా పెళ్ళికి రండి.");
  });
  it("by default ఇట్లు shows the family surname", () => {
    expect(inviterLinesTe(d({}))).toEqual(["హర్ష వర్ధన్ కుటుంబము"]);
    expect(inviterLinesTe(d({ surnameTe: "" }))).toEqual([]);
  });
  it("groom's / bride's family show the parents, or the person's name when there are none", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom" }))).toEqual(["శ్రీ రామారావు & శ్రీమతి సీత"]);
    expect(inviterLinesTe(d({ inviterMode: "bride", brideFatherTe: "", brideMotherTe: "" }))).toEqual(["ప్రియ"]);
  });
  it("both families give two lines, groom's first", () => {
    expect(inviterLinesTe(d({ inviterMode: "both" }))).toEqual(["శ్రీ రామారావు & శ్రీమతి సీత", "శ్రీ కృష్ణ & శ్రీమతి లక్ష్మి"]);
  });
  it("a custom name is used as typed (Telugu first, English as a fallback)", () => {
    expect(inviterLinesTe(d({ inviterMode: "custom", inviterTe: "మిత్రులు" }))).toEqual(["మిత్రులు"]);
    expect(inviterLinesTe(d({ inviterMode: "custom", inviterEn: "Rao" }))).toEqual(["Rao"]);
  });
  it("an unknown mode falls back to the surname", () => {
    expect(inviterLinesTe(d({ inviterMode: "nonsense" }))).toEqual(["హర్ష వర్ధన్ కుటుంబము"]);
  });
});
