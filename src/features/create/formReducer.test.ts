import { describe, expect, it } from "vitest";
import { formReducer, initialFormState, snapshot, type FormState } from "./formReducer";
import { initial, newContact, newEvent, newFamilyMember } from "./constants";
import type { InvitationData } from "../../types/invitation";

const base = (): FormState => initialFormState(null);
const withData = (patch: Partial<InvitationData>): InvitationData => ({ ...initial, ...patch });

describe("initialFormState", () => {
  it("starts clean: initial data, matching snapshot, nothing touched or submitted", () => {
    const s = initialFormState("abc");
    expect(s.data).toBe(initial);
    expect(s.snap).toBe(snapshot(initial));
    expect(s.touched).toEqual({});
    expect(s.submitted).toBe(false);
    expect(s.editId).toBe("abc");
    expect(s.categoryId).toBe("ALL");
    expect(s.lastSaved).toBeNull();
  });
});

describe("field", () => {
  it("sets one field and leaves the rest alone", () => {
    const s = formReducer(base(), { type: "field", key: "groomEn", value: "Ravi" });
    expect(s.data.groomEn).toBe("Ravi");
    expect(s.data.brideEn).toBe("");
  });
  it("returns the same state object when the value did not change", () => {
    const s = base();
    expect(formReducer(s, { type: "field", key: "groomEn", value: "" })).toBe(s);
  });
  it("does not change the saved snapshot (so the form becomes dirty)", () => {
    const s = formReducer(base(), { type: "field", key: "groomEn", value: "Ravi" });
    expect(snapshot(s.data)).not.toBe(s.snap);
  });
  it("does not change the previous state object", () => {
    const s = base();
    formReducer(s, { type: "field", key: "groomEn", value: "Ravi" });
    expect(s.data.groomEn).toBe("");
  });
});

describe("list items", () => {
  it("adds an item at the end", () => {
    const a = newEvent();
    const b = newEvent();
    let s = formReducer(base(), { type: "addItem", field: "events", item: a });
    s = formReducer(s, { type: "addItem", field: "events", item: b });
    expect(s.data.events.map((e) => e.id)).toEqual([a.id, b.id]);
  });
  it("keeps the three lists separate", () => {
    const c = newContact();
    const s = formReducer(base(), { type: "addItem", field: "groomContacts", item: c });
    expect(s.data.groomContacts).toHaveLength(1);
    expect(s.data.brideContacts).toHaveLength(0);
    expect(s.data.events).toHaveLength(0);
  });
  it("patches only the item with that id, keeping its other fields", () => {
    const a = newEvent();
    const b = newEvent();
    let s = formReducer(base(), { type: "addItem", field: "events", item: { ...a, name: "Haldi" } });
    s = formReducer(s, { type: "addItem", field: "events", item: { ...b, name: "Sangeet" } });
    s = formReducer(s, { type: "patchItem", field: "events", id: a.id, patch: { venue: "Hall" } });
    expect(s.data.events[0]).toMatchObject({ id: a.id, name: "Haldi", venue: "Hall" });
    expect(s.data.events[1]).toMatchObject({ id: b.id, name: "Sangeet", venue: "" });
  });
  it("patching an unknown id changes nothing in the list", () => {
    const a = newEvent();
    let s = formReducer(base(), { type: "addItem", field: "events", item: a });
    s = formReducer(s, { type: "patchItem", field: "events", id: "nope", patch: { name: "x" } });
    expect(s.data.events).toEqual([a]);
  });
  it("removes only the item with that id", () => {
    const a = newEvent();
    const b = newEvent();
    let s = formReducer(base(), { type: "addItem", field: "events", item: a });
    s = formReducer(s, { type: "addItem", field: "events", item: b });
    s = formReducer(s, { type: "removeItem", field: "events", id: a.id });
    expect(s.data.events.map((e) => e.id)).toEqual([b.id]);
  });
  it("removing an unknown id leaves the list as it was", () => {
    const a = newEvent();
    let s = formReducer(base(), { type: "addItem", field: "events", item: a });
    s = formReducer(s, { type: "removeItem", field: "events", id: "nope" });
    expect(s.data.events).toEqual([a]);
  });
});

describe("load / replaceData / saved", () => {
  it("load sets data and the snapshot together (form is clean)", () => {
    const d = withData({ groomEn: "Ravi" });
    const s = formReducer(base(), { type: "load", data: d });
    expect(s.data).toBe(d);
    expect(s.snap).toBe(snapshot(d));
  });
  it("load keeps editId, touched and submitted", () => {
    let s = initialFormState("e1");
    s = formReducer(s, { type: "touch", key: "groomEn" });
    s = formReducer(s, { type: "submit" });
    s = formReducer(s, { type: "load", data: withData({ groomEn: "Ravi" }) });
    expect(s.editId).toBe("e1");
    expect(s.touched).toEqual({ groomEn: true });
    expect(s.submitted).toBe(true);
  });
  it("replaceData changes data but not the snapshot (form is dirty, e.g. a restored draft)", () => {
    const d = withData({ groomEn: "Draft" });
    const s = formReducer(base(), { type: "replaceData", data: d });
    expect(s.data).toBe(d);
    expect(s.snap).toBe(snapshot(initial));
  });
  it("saved stores the id and time and makes the current data the snapshot", () => {
    let s = formReducer(base(), { type: "field", key: "groomEn", value: "Ravi" });
    s = formReducer(s, { type: "saved", editId: "id1", at: 123 });
    expect(s.editId).toBe("id1");
    expect(s.lastSaved).toBe(123);
    expect(s.snap).toBe(snapshot(s.data));
  });
  it("saved does not add the data of a later edit to the snapshot", () => {
    let s = formReducer(base(), { type: "saved", editId: "id1", at: 1 });
    s = formReducer(s, { type: "field", key: "brideEn", value: "Sita" });
    expect(snapshot(s.data)).not.toBe(s.snap);
  });
});

describe("touch / submit / category / reset", () => {
  it("touch marks a key and keeps earlier ones", () => {
    let s = formReducer(base(), { type: "touch", key: "a" });
    s = formReducer(s, { type: "touch", key: "b" });
    expect(s.touched).toEqual({ a: true, b: true });
  });
  it("touching an already touched key returns the same state object", () => {
    const s = formReducer(base(), { type: "touch", key: "a" });
    expect(formReducer(s, { type: "touch", key: "a" })).toBe(s);
  });
  it("submit sets the flag once and then returns the same state object", () => {
    const s = formReducer(base(), { type: "submit" });
    expect(s.submitted).toBe(true);
    expect(formReducer(s, { type: "submit" })).toBe(s);
  });
  it("category changes only the category", () => {
    const s = formReducer(base(), { type: "category", id: "WEDDING" });
    expect(s.categoryId).toBe("WEDDING");
    expect(s.data).toBe(initial);
  });
  it("reset gives a brand new form: no edit id, nothing touched or submitted, category ALL", () => {
    let s = initialFormState("e1");
    s = formReducer(s, { type: "field", key: "groomEn", value: "Ravi" });
    s = formReducer(s, { type: "touch", key: "groomEn" });
    s = formReducer(s, { type: "submit" });
    s = formReducer(s, { type: "category", id: "WEDDING" });
    s = formReducer(s, { type: "saved", editId: "e1", at: 5 });
    s = formReducer(s, { type: "reset" });
    expect(s).toEqual(initialFormState(null));
  });
});

describe("formReducer: custom inviter names (T2)", () => {
  const mk = (id: string) => ({ id, prefix: "", nameEn: "", nameTe: "", relationEn: "", relationTe: "" });
  it("adds, patches and removes rows by id, leaving the other lists alone", () => {
    let s = formReducer(initialFormState(null), { type: "addItem", field: "inviterNames", item: mk("a") });
    s = formReducer(s, { type: "addItem", field: "inviterNames", item: mk("b") });
    s = formReducer(s, { type: "patchItem", field: "inviterNames", id: "a", patch: { nameTe: "రావు", prefix: "sri" } });
    expect(s.data.inviterNames.map((n) => [n.id, n.nameTe, n.prefix])).toEqual([["a", "రావు", "sri"], ["b", "", ""]]);
    s = formReducer(s, { type: "removeItem", field: "inviterNames", id: "a" });
    expect(s.data.inviterNames.map((n) => n.id)).toEqual(["b"]);
    expect(s.data.events).toEqual([]);
  });
  it("a reorder through the `field` action replaces the list", () => {
    let s = formReducer(initialFormState(null), { type: "field", key: "inviterNames", value: [mk("a"), mk("b")] });
    s = formReducer(s, { type: "field", key: "inviterNames", value: [mk("b"), mk("a")] });
    expect(s.data.inviterNames.map((n) => n.id)).toEqual(["b", "a"]);
  });
});

describe("relatives (T8)", () => {
  it("a new relative is shown, belongs to its side and starts as a brother", () => {
    const g = newFamilyMember("groom"), b = newFamilyMember("bride");
    expect(g).toMatchObject({ side: "groom", relation: "brother", show: "1", late: "", nameEn: "", nameTe: "" });
    expect(b.side).toBe("bride");
    expect(g.id).not.toBe(b.id);
  });
  it("adds, patches and removes a relative in the one shared list", () => {
    const f = newFamilyMember("groom"), g = newFamilyMember("bride");
    let s = formReducer(base(), { type: "addItem", field: "familyMembers", item: f });
    s = formReducer(s, { type: "addItem", field: "familyMembers", item: g });
    s = formReducer(s, { type: "patchItem", field: "familyMembers", id: f.id, patch: { relation: "sister", late: "1" } });
    expect(s.data.familyMembers.map((x) => [x.side, x.relation, x.late])).toEqual([["groom", "sister", "1"], ["bride", "brother", ""]]);
    s = formReducer(s, { type: "removeItem", field: "familyMembers", id: f.id });
    expect(s.data.familyMembers.map((x) => x.id)).toEqual([g.id]);
  });
  it("starts with no relatives", () => {
    expect(initial.familyMembers).toEqual([]);
  });
});
