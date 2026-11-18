import { describe, expect, it } from "vitest";
import { EVENT_TYPES, EVENT_TYPE_IDS, MAX_EVENTS, applyEventType, okEventType } from "./eventTypes";

describe("event types (T6)", () => {
  it("allows six events", () => expect(MAX_EVENTS).toBe(6));
  it("has unique ids and a Telugu and English name for every preset except custom", () => {
    expect(new Set(EVENT_TYPE_IDS).size).toBe(EVENT_TYPES.length);
    EVENT_TYPES.filter((t) => t.id !== "custom").forEach((t) => { expect(t.nameEn).not.toBe(""); expect(t.nameTe).not.toBe(""); });
    expect(EVENT_TYPES.find((t) => t.id === "custom")).toMatchObject({ nameEn: "", nameTe: "" });
  });
  it("accepts empty, missing and known ids only", () => {
    ["", undefined, null, "haldi", "custom"].forEach((v) => expect(okEventType(v)).toBe(true));
    ["party", "HALDI", 5, {}].forEach((v) => expect(okEventType(v)).toBe(false));
  });
  it("fills a name only when it is still empty (or blank)", () => {
    expect(applyEventType({ name: "", nameTe: "" }, "mehendi")).toEqual({ type: "mehendi", name: "Mehendi", nameTe: "మెహందీ" });
    expect(applyEventType({ name: "  ", nameTe: "నా పేరు" }, "mehendi")).toEqual({ type: "mehendi", name: "Mehendi" });
    expect(applyEventType({ name: "Mine", nameTe: "నా పేరు" }, "mehendi")).toEqual({ type: "mehendi" });
    expect(applyEventType({ name: "", nameTe: "" }, "custom")).toEqual({ type: "custom" });
    expect(applyEventType({ name: "", nameTe: "" }, "")).toEqual({ type: "" });
  });
});
