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

const IDS: SectionId[] = ["template", "family", "groom", "bride", "message", "venue", "seo", "events", "client"];
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
  it("shows the nine sections with their titles and the tag that tagFor gives", () => {
    show();
    const titles = [...host.querySelectorAll("section h2")].map((x) => x.textContent);
    expect(titles).toEqual(["Template Options", "Family & Wedding", "Groom's Details", "Bride's Details", "Invitation Text", "Reception & Venue", "Additional Events", "Link Preview & Custom Link", "Client Access"]);
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
    const required = (name: string) => !!input(name).closest(".f")!.querySelector(".req");
    for (const n of ["weddingDate", "groomEn", "brideEn"]) expect(required(n)).toBe(true);
    for (const n of ["weddingDate", "groomEn", "brideEn"]) expect(input(n).getAttribute("aria-required")).toBe("true");
    expect(input("surnameEn").getAttribute("aria-required")).toBeNull();
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
    const label = input("groomEn").closest(".f")!;
    expect(label.querySelector(".err")?.textContent).toBe("Groom name is required");
    expect(input("groomEn").getAttribute("aria-invalid")).toBe("true");
    expect(label.className).toContain("has-err");
    expect(label.querySelector(".err")?.getAttribute("role")).toBe("alert");
    expect(label.querySelector("label")?.textContent).not.toContain("Groom name is required");
    expect(input("brideEn").getAttribute("aria-invalid")).toBe("false");
    expect(input("brideEn").closest(".f")!.querySelector(".err")).toBeNull();
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
    expect(!!input("receptionDate").closest(".f")!.querySelector(".req")).toBe(true);
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
    expect(input("event-e1-maps").closest(".f")!.querySelector(".err")?.textContent).toBe("Use a web link");
    expect(input("event-e1-date").closest(".f")!.querySelector(".err")).toBeNull();
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

  describe("invitation text section", () => {
    const radio = (label: string) => [...host.querySelectorAll('[role="radio"]')].find((b) => b.textContent === label) as HTMLButtonElement;
    it("choosing who invites calls set with the mode", () => {
      show();
      click(radio("Both families"));
      expect(props.set).toHaveBeenCalledWith("inviterMode", "both");
    });
    it("the message box writes the edited message", () => {
      show();
      const box = host.querySelector("#f-inviteMessageTe") as HTMLTextAreaElement;
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(box, "హలో");
        box.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(props.set).toHaveBeenCalledWith("inviteMessageTe", "హలో");
    });
    it("Custom name shows the name boxes", () => {
      show({ data: { ...initial, inviterMode: "custom" } });
      expect(input("inviterEn")).toBeTruthy();
      expect(input("inviterTe")).toBeTruthy();
    });
  });
});

describe("CreateForm: parent status (T1)", () => {
  const group = (label: string) => host.querySelector(`[role="radiogroup"][aria-label="${label}"]`) as HTMLElement;
  const radio = (label: string, text: string) => [...group(label).querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;

  it("each of the four parents has Alive / Late / Hide, with Alive selected by default", () => {
    show();
    for (const who of ["Groom's father", "Groom's mother", "Bride's father", "Bride's mother"]) {
      const labels = [...group(`${who} status`).querySelectorAll("button")].map((b) => b.textContent);
      expect(labels).toEqual(["Alive", "Late", "Hide"]);
      expect(radio(`${who} status`, "Alive").getAttribute("aria-checked")).toBe("true");
    }
  });

  it("choosing Late or Hide calls set with the right key and value, and focuses that parent in the preview", () => {
    show();
    click(radio("Groom's father status", "Late"));
    expect(props.set).toHaveBeenCalledWith("groomFatherStatus", "late");
    click(radio("Bride's mother status", "Hide"));
    expect(props.set).toHaveBeenCalledWith("brideMotherStatus", "hidden");
    click(radio("Bride's mother status", "Alive"));
    expect(props.set).toHaveBeenCalledWith("brideMotherStatus", "");
    expect(props.focus).toHaveBeenCalledWith("groomFatherStatus");
  });

  it("a late parent: phone is disabled (value kept) and the hint is shown; names stay editable", () => {
    show({ data: { ...initial, groomFatherStatus: "late", groomFatherPhone: "9876543210", groomFatherEn: "Rao" } });
    expect(input("groomFatherPhone").disabled).toBe(true);
    expect(input("groomFatherPhone").value).toBe("9876543210");
    expect(input("groomFatherEn").disabled).toBe(false);
    expect(host.textContent).toContain("The phone number is not shown.");
    expect(input("groomMotherPhone").disabled).toBe(false);
  });

  it("a hidden parent: name and phone are disabled, values are kept, the other parent is untouched", () => {
    show({ data: { ...initial, brideFatherStatus: "hidden", brideFatherEn: "Krishna", brideFatherPhone: "9000000001" } });
    for (const n of ["brideFatherEn", "brideFatherTe", "brideFatherPhone"]) expect(input(n).disabled).toBe(true);
    expect(input("brideFatherEn").value).toBe("Krishna");
    expect(input("brideMotherEn").disabled).toBe(false);
    expect(host.textContent).toContain("Not shown on the invitation.");
  });

  it("alive parents have everything enabled, and an unknown stored value counts as alive", () => {
    show({ data: { ...initial, groomFatherStatus: "dead" as never } });
    expect(input("groomFatherPhone").disabled).toBe(false);
    expect(radio("Groom's father status", "Alive").getAttribute("aria-checked")).toBe("true");
  });

  it("while the section loads the buttons are disabled", () => {
    show({ sectionLoading: allLoading(true) });
    expect(radio("Groom's father status", "Late").disabled).toBe(true);
  });
});

describe("CreateForm: closing title, who appears, custom names (T2)", () => {
  const row = (o: object = {}) => ({ id: "n1", prefix: "", nameEn: "", nameTe: "", relationEn: "", relationTe: "", ...o });
  const select = (id: string) => host.querySelector(`#${id}`) as HTMLSelectElement;
  const choose = (el: HTMLSelectElement, value: string) => act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const box = (label: string) => [...host.querySelectorAll<HTMLInputElement>('[aria-label="People who appear"] input')].find((i) => i.parentElement?.textContent?.trim() === label) as HTMLInputElement;
  const quick = (label: string) => [...host.querySelectorAll('[aria-label="Quick choices"] button')].find((b) => b.textContent === label) as HTMLButtonElement;

  it("the title list has the presets, a custom title and Hide; ఇట్లు is selected by default", () => {
    show();
    const sel = select("f-closingTitleMode");
    expect([...sel.options].map((o) => o.value)).toEqual(["itlu", "aahvaninchuvaaru", "compliments", "invitedBy", "regards", "custom", "none"]);
    expect(sel.value).toBe("itlu");
  });
  it("choosing a title writes the mode and focuses the invitation text; Custom shows the two title boxes", () => {
    show();
    choose(select("f-closingTitleMode"), "compliments");
    expect(props.set).toHaveBeenCalledWith("closingTitleMode", "compliments");
    expect(props.focus).toHaveBeenCalledWith("closingTitleMode");
    expect(input("closingTitleEn")).toBeNull();
    show({ data: { ...initial, closingTitleMode: "custom" } });
    typeInto(input("closingTitleTe"), "మీ ఆత్మీయులు");
    expect(props.set).toHaveBeenCalledWith("closingTitleTe", "మీ ఆత్మీయులు");
    expect(input("closingTitleEn")).toBeTruthy();
  });

  it("an untouched old record shows the boxes of its old choice ticked and writes nothing", () => {
    show({ data: { ...initial, inviterMode: "both" } });
    expect(box("Groom’s family (parents)").checked).toBe(true);
    expect(box("Bride’s family (parents)").checked).toBe(true);
    expect(box("Groom").checked).toBe(false);
    expect(box("Family surname").checked).toBe(false);
    expect(props.set).not.toHaveBeenCalled();
    show();
    expect(box("Family surname").checked).toBe(true);
  });
  it("ticking and unticking a box writes the list in a fixed order; unticking the last one writes none", () => {
    show({ data: { ...initial, inviterSources: "brideMother" } });
    click(box("Groom"));
    expect(props.set).toHaveBeenCalledWith("inviterSources", "groom,brideMother");
    click(box("Bride’s mother"));
    expect(props.set).toHaveBeenCalledWith("inviterSources", "none");
  });
  it("the quick buttons set exactly those people", () => {
    show();
    click(quick("Groom side"));
    expect(props.set).toHaveBeenCalledWith("inviterSources", "groom,groomFather,groomMother");
    click(quick("Bride side"));
    expect(props.set).toHaveBeenCalledWith("inviterSources", "bride,brideFather,brideMother");
    click(quick("All"));
    expect(props.set).toHaveBeenCalledWith("inviterSources", "groom,groomFather,groomMother,bride,brideFather,brideMother");
    click(quick("Nobody"));
    expect(props.set).toHaveBeenCalledWith("inviterSources", "none");
    show({ data: { ...initial, inviterSources: "groom,groomFather,groomMother" } });
    expect(quick("Groom side").className).toBe("on");
    expect(quick("All").className).toBe("");
  });
  it("the five old buttons still work, and clearing the new list hands control back to them", () => {
    show({ data: { ...initial, inviterSources: "groom" } });
    const radios = [...host.querySelectorAll('[aria-label="Who is inviting"] [role="radio"]')] as HTMLButtonElement[];
    expect(radios.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    click(radios.find((r) => r.textContent === "Bride’s family")!);
    expect(props.set).toHaveBeenCalledWith("inviterMode", "bride");
    expect(props.set).toHaveBeenCalledWith("inviterSources", "");
  });

  it("Add name calls add for the inviter list with a blank row", () => {
    show();
    click(button("Add name"));
    expect(props.add).toHaveBeenCalledTimes(1);
    const [field, make] = (props.add as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(field).toBe("inviterNames");
    expect(make()).toMatchObject({ prefix: "", nameEn: "", nameTe: "", relationEn: "", relationTe: "" });
    expect(make().id).toBeTruthy();
  });
  it("a row has a prefix list and name and relation boxes that patch that row only", () => {
    show({ data: { ...initial, inviterNames: [row({ id: "n1" }), row({ id: "n2" })] } });
    expect([...select("f-inviter-n1-prefix").options].map((o) => o.textContent)).toEqual(["No prefix", "శ్రీ", "శ్రీమతి", "చి||", "కీ.శే.", "డాక్టర్"]);
    choose(select("f-inviter-n2-prefix"), "dr");
    expect(props.patch).toHaveBeenCalledWith("inviterNames", "n2", { prefix: "dr" });
    typeInto(input("inviter-n1-nameEn"), "Rao");
    expect(props.patch).toHaveBeenCalledWith("inviterNames", "n1", { nameEn: "Rao" });
    typeInto(input("inviter-n1-nameTe"), "రావు");
    expect(props.patch).toHaveBeenCalledWith("inviterNames", "n1", { nameTe: "రావు" });
    typeInto(input("inviter-n2-relationEn"), "Uncle");
    expect(props.patch).toHaveBeenCalledWith("inviterNames", "n2", { relationEn: "Uncle" });
    typeInto(input("inviter-n2-relationTe"), "మామ");
    expect(props.patch).toHaveBeenCalledWith("inviterNames", "n2", { relationTe: "మామ" });
  });
  it("a row's boxes focus the invitation text in the preview", () => {
    show({ data: { ...initial, inviterNames: [row()] } });
    focusEl(input("inviter-n1-nameEn"));
    expect(props.focus).toHaveBeenCalledWith("inviterNames");
  });
  it("Remove deletes that row; Up and Down reorder through set, and the ends are disabled", () => {
    show({ data: { ...initial, inviterNames: [row({ id: "a" }), row({ id: "b" }), row({ id: "c" })] } });
    click(button("Remove name"));
    expect(props.remove).toHaveBeenCalledWith("inviterNames", "a");
    const ups = [...host.querySelectorAll<HTMLButtonElement>('button[aria-label="Move name up"]')];
    const downs = [...host.querySelectorAll<HTMLButtonElement>('button[aria-label="Move name down"]')];
    expect(ups.map((b) => b.disabled)).toEqual([true, false, false]);
    expect(downs.map((b) => b.disabled)).toEqual([false, false, true]);
    click(ups[1]);
    expect((props.set as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe("inviterNames");
    expect(((props.set as ReturnType<typeof vi.fn>).mock.calls.at(-1)![1] as { id: string }[]).map((n) => n.id)).toEqual(["b", "a", "c"]);
    click(downs[0]);
    expect(((props.set as ReturnType<typeof vi.fn>).mock.calls.at(-1)![1] as { id: string }[]).map((n) => n.id)).toEqual(["b", "a", "c"]);
  });
  it("after 8 names the Add button is replaced by a hint", () => {
    show({ data: { ...initial, inviterNames: Array.from({ length: 8 }, (_, i) => row({ id: `n${i}` })) } });
    expect(button("Add name")).toBeUndefined();
    expect(host.textContent).toContain("up to 8 custom names");
  });
  it("shows a one-line preview of the title and the lines", () => {
    show({ data: { ...initial, closingTitleMode: "compliments", inviterSources: "groom", groomTe: "రవి", inviterNames: [row({ prefix: "sri", nameTe: "రావు", relationTe: "మామ" })] } });
    expect(host.textContent).toContain("Preview: శుభాకాంక్షలతో — రవి · శ్రీ రావు (మామ)");
    show({ data: { ...initial, closingTitleMode: "none", inviterSources: "none" } });
    expect(host.textContent).toContain("Preview: (no title) — (no names)");
  });
  it("while the section loads the controls are disabled and no rows are drawn", () => {
    show({ sectionLoading: allLoading(true), data: { ...initial, inviterNames: [row()] } });
    expect(select("f-closingTitleMode").disabled).toBe(true);
    expect(quick("All").disabled).toBe(true);
    expect(box("Groom").disabled).toBe(true);
    expect(input("inviter-n1-nameEn")).toBeNull();
    expect(host.textContent).not.toContain("Preview:");
  });
});

describe("CreateForm: house names, gotram, honorific (T3)", () => {
  it("the groom and the bride each have house name and gotram boxes that write their own keys", () => {
    show();
    const cases: [string, string][] = [["groomSurnameEn", "Kommineni"], ["groomSurnameTe", "కొమ్మినేని"], ["groomGotramEn", "Bharadwaja"], ["groomGotramTe", "భరద్వాజ"],
      ["brideSurnameEn", "Patibandla"], ["brideSurnameTe", "పాటిబండ్ల"], ["brideGotramEn", "Kashyapa"], ["brideGotramTe", "కశ్యప"]];
    for (const [k, v] of cases) { typeInto(input(k), v); expect(props.set).toHaveBeenCalledWith(k, v); }
  });
  it("the shared family surname is still there", () => {
    show();
    expect(input("surnameEn")).toBeTruthy();
    expect(input("surnameTe")).toBeTruthy();
  });
  it("the honorific checkbox is off by default, and writes chiranjeevi or empty", () => {
    show();
    const cb = [...host.querySelectorAll<HTMLInputElement>("label.check input")].find((i) => i.parentElement?.textContent?.includes("చి||"))!;
    expect(cb.checked).toBe(false);
    click(cb);
    expect(props.set).toHaveBeenCalledWith("coupleHonorific", "chiranjeevi");
    show({ data: { ...initial, coupleHonorific: "chiranjeevi" } });
    const on = [...host.querySelectorAll<HTMLInputElement>("label.check input")].find((i) => i.parentElement?.textContent?.includes("చి||"))!;
    expect(on.checked).toBe(true);
    click(on);
    expect(props.set).toHaveBeenCalledWith("coupleHonorific", "");
  });
  it("the parentage checkbox is off by default and writes 1 or empty", () => {
    show();
    const find = (root: ParentNode) => [...root.querySelectorAll<HTMLInputElement>("label.check input")].find((i) => i.parentElement?.textContent?.includes("son of / daughter of"))!;
    expect(find(host).checked).toBe(false);
    click(find(host));
    expect(props.set).toHaveBeenCalledWith("showParentage", "1");
    show({ data: { ...initial, showParentage: "1" } });
    expect(find(host).checked).toBe(true);
    click(find(host));
    expect(props.set).toHaveBeenCalledWith("showParentage", "");
  });
  it("each side has a Position among children dropdown with all seven choices; choosing one sets the key", () => {
    show();
    for (const [side, key] of [["groom", "groomOrder"], ["bride", "brideOrder"]] as const) {
      const sel = host.querySelector<HTMLSelectElement>(`#f-${key}`)!;
      expect(sel).toBeTruthy();
      expect(sel.value).toBe("");
      expect([...sel.options].map((o) => o.value)).toEqual(["", "only", "eldest", "second", "third", "fourth", "youngest"]);
      act(() => { sel.value = "second"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
      expect(props.set).toHaveBeenCalledWith(key, "second");
      expect(side).toBeTruthy();
    }
  });
  it("focusing a house name or gotram box points the preview at that person's card", () => {
    show();
    focusEl(input("brideGotramTe"));
    expect(props.focus).toHaveBeenCalledWith("brideGotramTe");
  });
  it("the new boxes are ghosts while their section loads", () => {
    show({ sectionLoading: allLoading(true) });
    expect(input("groomSurnameEn").disabled).toBe(true);
    expect(input("brideGotramTe").disabled).toBe(true);
  });
});
