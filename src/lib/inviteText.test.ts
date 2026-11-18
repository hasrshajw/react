import { describe, expect, it } from "vitest";
import { initial } from "../features/create/constants";
import { DEFAULT_INVITE_MESSAGE_TE, inviteMessageTe, inviterLinesTe, parentPrefixTe, parentStatus } from "./inviteText";
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
    expect(inviterLinesTe(d({ inviterMode: "groom" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత"]);
    expect(inviterLinesTe(d({ inviterMode: "bride", brideFatherTe: "", brideMotherTe: "" }))).toEqual(["ప్రియ"]);
  });
  it("both families give four lines, groom's parents first", () => {
    expect(inviterLinesTe(d({ inviterMode: "both" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
  });
  it("a custom name is used as typed (Telugu first, English as a fallback)", () => {
    expect(inviterLinesTe(d({ inviterMode: "custom", inviterTe: "మిత్రులు" }))).toEqual(["మిత్రులు"]);
    expect(inviterLinesTe(d({ inviterMode: "custom", inviterEn: "Rao" }))).toEqual(["Rao"]);
  });
  it("an unknown mode falls back to the surname", () => {
    expect(inviterLinesTe(d({ inviterMode: "nonsense" }))).toEqual(["హర్ష వర్ధన్ కుటుంబము"]);
  });
});

describe("parent status (T1)", () => {
  it("unknown or missing values count as alive", () => {
    expect(parentStatus(undefined)).toBe("");
    expect(parentStatus("dead")).toBe("");
    expect(parentStatus("late")).toBe("late");
    expect(parentStatus("hidden")).toBe("hidden");
    expect(parentPrefixTe("father", "")).toBe("శ్రీ");
    expect(parentPrefixTe("mother", "")).toBe("శ్రీమతి");
    expect(parentPrefixTe("mother", "late")).toBe("కీ.శే.");
  });
  it("a record without any status gives exactly the old lines", () => {
    expect(inviterLinesTe(d({ inviterMode: "both" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
  });
  it("a late parent is printed with కీ.శే. instead of శ్రీ / శ్రీమతి", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "late" }))).toEqual(["కీ.శే. రామారావు", "శ్రీమతి సీత"]);
    expect(inviterLinesTe(d({ inviterMode: "bride", brideMotherStatus: "late" }))).toEqual(["శ్రీ కృష్ణ", "కీ.శే. లక్ష్మి"]);
    expect(inviterLinesTe(d({ inviterMode: "both", groomFatherStatus: "late", brideMotherStatus: "late" }))).toEqual(["కీ.శే. రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "కీ.శే. లక్ష్మి"]);
  });
  it("a hidden parent is skipped", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "hidden" }))).toEqual(["శ్రీమతి సీత"]);
    expect(inviterLinesTe(d({ inviterMode: "both", groomMotherStatus: "hidden", brideFatherStatus: "hidden" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి లక్ష్మి"]);
  });
  it("when no parent line is left the person's own name is used", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "hidden", groomMotherStatus: "hidden" }))).toEqual(["రవి"]);
    expect(inviterLinesTe(d({ inviterMode: "bride", brideFatherStatus: "hidden", brideMotherTe: "" }))).toEqual(["ప్రియ"]);
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "hidden", groomMotherStatus: "hidden", groomTe: "" }))).toEqual([]);
  });
  it("a late parent with no name typed adds no line", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherTe: "", groomFatherStatus: "late" }))).toEqual(["శ్రీమతి సీత"]);
  });
});
