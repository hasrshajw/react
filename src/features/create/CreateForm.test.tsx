// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "../../test/renderHook";

/* The create form (task M-14). The real sections, fields, bilingual pairs and contact rows run in jsdom. Only the two heavy
   children (template picker, link-preview section) are replaced by stubs that show the props they receive, so the tests check
   what the person sees and exactly which callback the form calls with which key. */
const h = vi.hoisted(() => ({ picker: null as null | Record<string, unknown>, seo: null as null | Record<string, unknown> }));

vi.mock("./components/TemplatePicker", () => ({
  TemplatePicker: (p: Record<string, unknown> & { onSelect: (v: string) => void }) => {
    h.picker = p;
    return <button type="button" data-testid="picker" onClick={() => p.onSelect("tpl-9")}>picker</button>;
  },
}));
vi.mock("./components/SeoSection", () => ({
  SeoSection: (p: Record<string, unknown>) => { h.seo = p; return <div data-testid="seo">seo</div>; },
}));

import { CreateForm, type CreateFormProps } from "./CreateForm";
import { initial } from "./constants";
import type { ContactItem, EventItem, SectionId } from "../../types/invitation";

const IDS: SectionId[] = ["template", "family", "groom", "bride", "venue", "seo", "events", "client"];
const allLoading = (v: boolean) => Object.fromEntries(IDS.map((i) => [i, v])) as Record<SectionId, boolean>;

let host: HTMLDivElement, root: Root;
let props: CreateFormProps;

function makeProps(over: Partial<CreateFormProps> = {}): CreateFormProps {
  return {
    data: { ...initial },
    categories: [], templates: [], categoryId: "ALL", onCategory: vi.fn(),
    sectionLoading: allLoading(false), templatesLoading: false, expectTemplate: false,
    set: vi.fn(), add: vi.fn(), patch: vi.fn(), remove: vi.fn(), focus: vi.fn(),
    vis: vi.fn(() => undefined), touch: vi.fn(),
    tagFor: (id: SectionId) => ({ tone: "ok", text: `tag-${id}` }),
    onSubmit: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
    notify: vi.fn(), invitationId: "inv-1",
    ...over,
  };
}
function show(over: Partial<CreateFormProps> = {}) {
  props = makeProps(over);
  act(() => { root.render(<CreateForm {...props} />); });
}
const input = (name: string) => host.querySelector(`#f-${name}`) as HTMLInputElement;
const byLabel = (l: string) => host.querySelector(`input[aria-label="${l}"]`) as HTMLInputElement;
const button = (label: string) => [...host.querySelectorAll("button")].find((b) => (b.textContent || "").includes(label) || b.getAttribute("aria-label") === label) as HTMLButtonElement;
/** Controlled inputs in jsdom need the native value setter and an `input` event. */
function typeInto(el: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const focusEl = (el: HTMLElement) => act(() => { el.dispatchEvent(new FocusEvent("focusin", { bubbles: true })); el.focus(); });
const blurEl = (el: HTMLElement) => act(() => { el.focus(); el.blur(); });

const contact = (over: Partial<ContactItem> = {}): ContactItem => ({ id: "c1", nameEn: "Ravi", nameTe: "", phone: "9876543210", ...over });
const ev = (over: Partial<EventItem> = {}): EventItem => ({ id: "e1", name: "Sangeet", nameTe: "", date: "", time: "", venue: "", venueTe: "", maps: "", ...over });

beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); h.picker = null; h.seo = null; });
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("CreateForm: layout", () => {
  it("shows the eight sections with their titles and the tag that tagFor gives", () => {
    show();
    const titles = [...host.querySelectorAll("section h2")].map((x) => x.textContent);
    expect(titles).toEqual(["Template Options", "Family & Wedding", "Groom's Details", "Bride's Details", "Reception & Venue", "Link Preview & Custom Link", "Additional Events", "Client Access"]);
    for (const id of IDS) expect(host.querySelector(`#sec-${id} .sec-tag`)?.textContent).toBe(`tag-${id}`);
  });

  it("is a form that does not use the browser's own validation, and submits through onSubmit", () => {
    show();
    const form = host.querySelector("form#create-form") as HTMLFormElement;
    expect(form.noValidate).toBe(true);
    act(() => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("marks only the required fields", () => {
    show();
    const required = (name: string) => !!input(name).closest("label")!.querySelector(".req");
    for (const n of ["weddingDate", "groomEn", "brideEn"]) expect(required(n)).toBe(true);
    for (const n of ["surnameEn", "muhurthamTime", "groomTe", "venueEn", "venueAddress"]) expect(required(n)).toBe(false);
  });

  it("marks the Telugu fields with lang=te", () => {
    show();
    expect(input("groomTe").lang).toBe("te");
    expect(input("surnameTe").lang).toBe("te");
    expect(input("groomEn").lang).toBe("");
  });
});

describe("CreateForm: fields", () => {
  it("shows the value from data and calls set with the field name and the typed text", () => {
    show({ data: { ...initial, groomEn: "Ravi" } });
    expect(input("groomEn").value).toBe("Ravi");
    typeInto(input("groomEn"), "Raviteja");
    expect(props.set).toHaveBeenCalledWith("groomEn", "Raviteja");
    typeInto(input("venueMaps"), "https://maps.google.com/x");
    expect(props.set).toHaveBeenCalledWith("venueMaps", "https://maps.google.com/x");
  });

  it("uses the right input types for date, time and phone fields", () => {
    show();
    expect(input("weddingDate").type).toBe("date");
    expect(input("muhurthamTime").type).toBe("time");
    expect(input("groomFatherPhone").type).toBe("tel");
    expect(input("brideMotherPhone").type).toBe("tel");
  });

  it("tells the page which field has focus, and marks a field as touched when it is left", () => {
    show();
    focusEl(input("brideEn"));
    expect(props.focus).toHaveBeenCalledWith("brideEn");
    expect(props.touch).not.toHaveBeenCalled();
    blurEl(input("brideEn"));
    expect(props.touch).toHaveBeenCalledWith("brideEn");
  });

  it("shows the message from vis under the field and marks it invalid; other fields stay clean", () => {
    show({ vis: vi.fn((k: string) => (k === "groomEn" ? "Groom name is required" : undefined)) });
    const label = input("groomEn").closest("label")!;
    expect(label.querySelector(".err")?.textContent).toBe("Groom name is required");
    expect(input("groomEn").getAttribute("aria-invalid")).toBe("true");
    expect(label.className).toContain("has-err");
    expect(input("brideEn").getAttribute("aria-invalid")).toBe("false");
    expect(input("brideEn").closest("label")!.querySelector(".err")).toBeNull();
  });
});

describe("CreateForm: loading ghosts (per section)", () => {
  it("ghosts only the sections whose data has not arrived", () => {
    show({ data: { ...initial, groomEn: "Ravi", brideEn: "Sita" }, sectionLoading: { ...allLoading(false), groom: true } });
    expect(input("groomEn").disabled).toBe(true);
    expect(input("groomEn").value).toBe("");
    expect(host.querySelector("#sec-groom")!.getAttribute("aria-busy")).toBe("true");
    expect(input("brideEn").disabled).toBe(false);
    expect(input("brideEn").value).toBe("Sita");
    expect(host.querySelector("#sec-bride")!.getAttribute("aria-busy")).toBeNull();
  });

  it("shows no contacts, no events and no reception date while those sections load, only ghost add buttons", () => {
    show({ data: { ...initial, groomContacts: [contact()], events: [ev()], receptionEnabled: true }, sectionLoading: allLoading(true) });
    expect(host.querySelectorAll(".repeat").length).toBe(0);
    expect(host.querySelectorAll(".sk-bg[aria-hidden='true']").length).toBeGreaterThan(0);
    expect(button("Add event")).toBeUndefined();
    expect(button("Add contact")).toBeUndefined();
  });

  it("disables the reception checkbox while the venue section loads", () => {
    show({ sectionLoading: { ...allLoading(false), venue: true } });
    expect((host.querySelector("#sec-venue input[type=checkbox]") as HTMLInputElement).disabled).toBe(true);
  });
});

describe("CreateForm: reception", () => {
  it("shows the reception date and time only when the reception is on", () => {
    show({ data: { ...initial, receptionEnabled: false } });
    expect(input("receptionDate")).toBeNull();
    act(() => { root.render(<CreateForm {...props} data={{ ...initial, receptionEnabled: true }} />); });
    expect(input("receptionDate")).not.toBeNull();
    expect(input("receptionTime")).not.toBeNull();
    expect(!!input("receptionDate").closest("label")!.querySelector(".req")).toBe(true);
  });

  it("reports the checkbox as a boolean", () => {
    show({ data: { ...initial, receptionEnabled: false } });
    const box = host.querySelector("#sec-venue input[type=checkbox]") as HTMLInputElement;
    expect(box.checked).toBe(false);
    click(box);
    expect(props.set).toHaveBeenCalledWith("receptionEnabled", true);
  });
});

describe("CreateForm: contacts", () => {
  it("offers Add contact when there is none, once for the groom and once for the bride, and builds an empty contact", () => {
    show();
    const adds = [...host.querySelectorAll("button")].filter((b) => (b.textContent || "").includes("Add contact"));
    expect(adds.length).toBe(2);
    click(adds[0]);
    click(adds[1]);
    const calls = (props.add as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe("groomContacts");
    expect(calls[1][0]).toBe("brideContacts");
    const made = calls[0][1]() as ContactItem;
    expect(made).toMatchObject({ nameEn: "", nameTe: "", phone: "" });
    expect(typeof made.id).toBe("string");
    expect(made.id.length).toBeGreaterThan(0);
  });

  it("lists a contact, hides Add contact once there is one, and keeps the sides apart", () => {
    show({ data: { ...initial, groomContacts: [contact({ id: "g1", nameEn: "Groom uncle" })] } });
    expect(host.querySelector("#sec-groom input[aria-label='Contact name in English']")).not.toBeNull();
    expect((host.querySelector("#sec-groom input[aria-label='Contact name in English']") as HTMLInputElement).value).toBe("Groom uncle");
    expect([...host.querySelectorAll("#sec-groom button")].some((b) => (b.textContent || "").includes("Add contact"))).toBe(false);
    expect(host.querySelector("#sec-bride input[aria-label='Contact name in English']")).toBeNull();
    expect([...host.querySelectorAll("#sec-bride button")].some((b) => (b.textContent || "").includes("Add contact"))).toBe(true);
  });

  it("patches the right contact and list when typing, and removes it with the trash button", () => {
    show({ data: { ...initial, brideContacts: [contact({ id: "b1" })] } });
    typeInto(byLabel("Contact name in English"), "Kiran");
    expect(props.patch).toHaveBeenCalledWith("brideContacts", "b1", { nameEn: "Kiran" });
    typeInto(byLabel("Contact phone"), "9999999999");
    expect(props.patch).toHaveBeenCalledWith("brideContacts", "b1", { phone: "9999999999" });
    click(button("Remove contact"));
    expect(props.remove).toHaveBeenCalledWith("brideContacts", "b1");
  });

  it("focuses by list name, touches by the contact's own phone key, and shows that key's error", () => {
    show({ data: { ...initial, groomContacts: [contact({ id: "g1" })] }, vis: vi.fn((k: string) => (k === "contact-g1-phone" ? "Enter a valid phone" : undefined)) });
    const phone = byLabel("Contact phone");
    focusEl(phone);
    expect(props.focus).toHaveBeenCalledWith("groomContacts");
    blurEl(phone);
    expect(props.touch).toHaveBeenCalledWith("contact-g1-phone");
    expect(phone.getAttribute("aria-invalid")).toBe("true");
    expect(host.querySelector("#sec-groom .err")?.textContent).toBe("Enter a valid phone");
  });
});

describe("CreateForm: additional events", () => {
  it("offers Add event with up to two events, then shows the hint instead", () => {
    show({ data: { ...initial, events: [] } });
    click(button("Add event"));
    expect(props.add).toHaveBeenCalledWith("events", expect.any(Function));
    const made = (props.add as ReturnType<typeof vi.fn>).mock.calls[0][1]() as EventItem;
    expect(made).toMatchObject({ name: "", nameTe: "", date: "", time: "", venue: "", venueTe: "", maps: "" });

    act(() => { root.render(<CreateForm {...props} data={{ ...initial, events: [ev({ id: "e1" })] }} />); });
    expect(button("Add event")).toBeDefined();

    act(() => { root.render(<CreateForm {...props} data={{ ...initial, events: [ev({ id: "e1" }), ev({ id: "e2" })] }} />); });
    expect(button("Add event")).toBeUndefined();
    expect(host.querySelector("#sec-events .hint")?.textContent).toBe("This template supports two additional event slots.");
  });

  it("numbers the events and patches the event with the typed value", () => {
    show({ data: { ...initial, events: [ev({ id: "e1" }), ev({ id: "e2", name: "Reception" })] } });
    const subs = [...host.querySelectorAll("#sec-events .sub")].map((x) => x.textContent);
    expect(subs).toEqual(["Event 1", "Event 2"]);
    expect(input("event-e2-name").value).toBe("Reception");
    typeInto(input("event-e2-name"), "Reception dinner");
    expect(props.patch).toHaveBeenCalledWith("events", "e2", { name: "Reception dinner" });
    typeInto(input("event-e1-date"), "2027-02-01");
    expect(props.patch).toHaveBeenCalledWith("events", "e1", { date: "2027-02-01" });
    typeInto(input("event-e1-maps"), "https://maps.google.com/y");
    expect(props.patch).toHaveBeenCalledWith("events", "e1", { maps: "https://maps.google.com/y" });
  });

  it("removes the chosen event only", () => {
    show({ data: { ...initial, events: [ev({ id: "e1" }), ev({ id: "e2" })] } });
    click(host.querySelectorAll("button[aria-label='Remove event']")[1]);
    expect(props.remove).toHaveBeenCalledWith("events", "e2");
    expect(props.remove).toHaveBeenCalledTimes(1);
  });

  it("focuses with the position-based key the preview understands, and touches with the event's own key", () => {
    show({ data: { ...initial, events: [ev({ id: "e1" }), ev({ id: "e2" })] } });
    focusEl(input("event-e2-date"));
    expect(props.focus).toHaveBeenCalledWith("event-2-date");
    blurEl(input("event-e2-date"));
    expect(props.touch).toHaveBeenCalledWith("event-e2-date");
    focusEl(input("event-e1-nameTe"));
    expect(props.focus).toHaveBeenCalledWith("event-1-name-te");
  });

  it("shows the error for an event field from its own key", () => {
    show({ data: { ...initial, events: [ev({ id: "e1" })] }, vis: vi.fn((k: string) => (k === "event-e1-maps" ? "Use a web link" : undefined)) });
    expect(input("event-e1-maps").closest("label")!.querySelector(".err")?.textContent).toBe("Use a web link");
    expect(input("event-e1-date").closest("label")!.querySelector(".err")).toBeNull();
  });
});

describe("CreateForm: children", () => {
  it("gives the template picker the chosen template, and sets templateId when one is picked", () => {
    show({ data: { ...initial, templateId: "tpl-1" }, categoryId: "WED" });
    expect(h.picker).toMatchObject({ value: "tpl-1", categoryId: "WED" });
    click(host.querySelector("[data-testid=picker]")!);
    expect(props.set).toHaveBeenCalledWith("templateId", "tpl-9");
  });

  it("tells the picker when templates are loading, and that a pick is pending only while the template section loads and one is expected", () => {
    show({ templatesLoading: true, expectTemplate: true, sectionLoading: { ...allLoading(false), template: true } });
    expect(h.picker).toMatchObject({ loading: true, pending: true, expectSelected: true });
    show({ templatesLoading: false, expectTemplate: true, sectionLoading: allLoading(false) });
    expect(h.picker).toMatchObject({ loading: false, pending: false, expectSelected: true });
    show({ templatesLoading: false, expectTemplate: false, sectionLoading: { ...allLoading(false), template: true } });
    expect(h.picker).toMatchObject({ pending: false, expectSelected: false });
  });

  it("passes the template error to the picker", () => {
    show({ vis: vi.fn((k: string) => (k === "templateId" ? "Choose a template" : undefined)) });
    expect(h.picker).toMatchObject({ error: "Choose a template" });
  });

  it("gives the link-preview section the invitation id (it names the image file), notify, and its loading flag", () => {
    show({ invitationId: "inv-77", sectionLoading: { ...allLoading(false), seo: true } });
    expect(h.seo).toMatchObject({ invitationId: "inv-77", loading: true });
    expect(h.seo!.notify).toBe(props.notify);
    show({ invitationId: "inv-77" });
    expect(h.seo).toMatchObject({ loading: false });
  });
});
