import React from "react";
import { CalendarPlus, Heart, LayoutTemplate, Mail, MapPin, Plus, Search, Trash2, User, Users } from "../../components/Icons";
import type { Category, ContactItem, EventItem, InvitationData, ListField, SectionId, Template } from "../../types/invitation";
import { newEvent } from "./constants";
import { Bilingual } from "./components/Bilingual";
import { Contacts } from "./components/Contacts";
import { Field } from "./components/Field";
import { Section } from "./components/Section";
import { SeoSection } from "./components/SeoSection";
import { TemplatePicker } from "./components/TemplatePicker";

export interface CreateFormProps {
  data: InvitationData;
  categories: Category[];
  templates: Template[];
  categoryId: string;
  onCategory: (id: string) => void;
  /** Per-section loading: a section's fields are ghosts until ITS data has arrived (the invitation being edited).
   *  The template section's flag covers its own fields; the template cards follow `templatesLoading`. */
  sectionLoading: Record<SectionId, boolean>;
  /** Templates and categories are still loading. */
  templatesLoading: boolean;
  /** A template will be selected once data arrives (editing, or /create?template=…). */
  expectTemplate: boolean;
  set: <K extends keyof InvitationData>(key: K, value: InvitationData[K]) => void;
  add: (field: ListField, make: () => EventItem | ContactItem) => void;
  patch: (field: ListField, id: string, patch: Partial<EventItem & ContactItem>) => void;
  remove: (field: ListField, id: string) => void;
  focus: (field: string) => void;
  vis: (key: string) => string | undefined;
  touch: (key: string) => void;
  tagFor: (id: SectionId) => { tone: string; text: string; loading?: boolean };
  onSubmit: (e: React.FormEvent) => void;
  notify: (msg: string, tone?: "ok" | "error") => void;
  /** Id the invitation is saved under (used to name the preview image file). */
  invitationId: string;
  /** Last saved client email (from the server). Used to warn when the linked client is about to change. */
  originalClientEmail?: string;
  /** Admin form is the default. Client mode hides template picker and client-email section (B6). */
  mode?: "admin" | "client";
  /** Pending review: form stays visible but submission is blocked by the parent. */
  readOnly?: boolean;
}

export function CreateForm({ data, categories, templates, categoryId, onCategory, sectionLoading, templatesLoading, expectTemplate, set, add, patch, remove, focus, vis, touch, tagFor, onSubmit, notify, invitationId, originalClientEmail = "", mode = "admin", readOnly = false }: CreateFormProps) {
  const isClient = mode === "client";
  /* Each section ghosts its own fields until its own data is there. */
  const fx = (sec: SectionId) => {
    const loading = sectionLoading[sec];
    const fpx = (name: string, focusKey: string) => ({ name, onFocus: () => focus(focusKey), onBlur: () => touch(name), error: vis(name), loading });
    return { loading, fpx, fp: (name: string) => fpx(name, name) };
  };
  const tpl = fx("template"), fam = fx("family"), groom = fx("groom"), bride = fx("bride"), venue = fx("venue"), seo = fx("seo"), events = fx("events"), client = fx("client");
  const normalizedCurrent = data.clientEmail.trim().toLowerCase();
  const normalizedOriginal = originalClientEmail.trim().toLowerCase();
  const clientEmailChanged = normalizedOriginal !== "" && normalizedCurrent !== normalizedOriginal;
  return (
    <form id="create-form" className="create-builder-form" onSubmit={onSubmit} noValidate>
      {/* Always reset fieldset chrome; default browser border was showing around the whole form. */}
      <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }}>
      {!isClient && (
      <Section id="template" icon={LayoutTemplate} title="Template Options" tag={tagFor("template")} loading={tpl.loading}>
        <TemplatePicker
          categories={categories} categoryId={categoryId} onCategory={onCategory} templates={templates}
          value={data.templateId} onSelect={(v) => set("templateId", v)} error={vis("templateId")}
          loading={templatesLoading} pending={tpl.loading && expectTemplate} expectSelected={expectTemplate}
        />
      </Section>
      )}

      <Section id="family" icon={Users} title="Family & Wedding" tag={tagFor("family")} loading={fam.loading}>
        <Bilingual enLabel="Family Surname EN" teLabel="Family Surname తెలుగు" enField="surnameEn" teField="surnameTe" data={data} set={set} fp={fam.fp} />
        <div className="grid two">
          <Field label="Wedding Date" type="date" required {...fam.fp("weddingDate")} value={data.weddingDate} onChange={(v) => set("weddingDate", v)} />
          <Field label="Muhurtham Time" type="time" {...fam.fp("muhurthamTime")} value={data.muhurthamTime} onChange={(v) => set("muhurthamTime", v)} />
        </div>
      </Section>

      <Section id="groom" icon={User} title="Groom's Details" tag={tagFor("groom")} loading={groom.loading}>
        <Bilingual enLabel="Groom Name EN" teLabel="Groom Name తెలుగు" enField="groomEn" teField="groomTe" data={data} set={set} fp={groom.fp} required />
        <div className="sub">Father's Details</div>
        <Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="groomFatherEn" teField="groomFatherTe" data={data} set={set} fp={groom.fp} />
        <Field label="Father Phone" type="tel" inputMode="tel" {...groom.fp("groomFatherPhone")} value={data.groomFatherPhone} onChange={(v) => set("groomFatherPhone", v)} />
        <div className="sub">Mother's Details</div>
        <Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="groomMotherEn" teField="groomMotherTe" data={data} set={set} fp={groom.fp} />
        <Field label="Mother Phone" type="tel" inputMode="tel" {...groom.fp("groomMotherPhone")} value={data.groomMotherPhone} onChange={(v) => set("groomMotherPhone", v)} />
        <Contacts loading={groom.loading} field="groomContacts" items={data.groomContacts} add={add} patch={patch} remove={remove} focus={focus} vis={vis} touch={touch} />
      </Section>

      <Section id="bride" icon={Heart} title="Bride's Details" tag={tagFor("bride")} loading={bride.loading}>
        <Bilingual enLabel="Bride Name EN" teLabel="Bride Name తెలుగు" enField="brideEn" teField="brideTe" data={data} set={set} fp={bride.fp} required />
        <div className="sub">Father's Details</div>
        <Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="brideFatherEn" teField="brideFatherTe" data={data} set={set} fp={bride.fp} />
        <Field label="Father Phone" type="tel" inputMode="tel" {...bride.fp("brideFatherPhone")} value={data.brideFatherPhone} onChange={(v) => set("brideFatherPhone", v)} />
        <div className="sub">Mother's Details</div>
        <Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="brideMotherEn" teField="brideMotherTe" data={data} set={set} fp={bride.fp} />
        <Field label="Mother Phone" type="tel" inputMode="tel" {...bride.fp("brideMotherPhone")} value={data.brideMotherPhone} onChange={(v) => set("brideMotherPhone", v)} />
        <Contacts loading={bride.loading} field="brideContacts" items={data.brideContacts} add={add} patch={patch} remove={remove} focus={focus} vis={vis} touch={touch} />
      </Section>

      <Section id="venue" icon={MapPin} title="Reception & Venue" tag={tagFor("venue")} loading={venue.loading}>
        <label className="check">
          <input type="checkbox" disabled={venue.loading} checked={data.receptionEnabled} onChange={(e) => set("receptionEnabled", e.target.checked)} /> Include reception
        </label>
        {data.receptionEnabled && (
          <div className="grid two">
            <Field label="Reception Date" type="date" required {...venue.fp("receptionDate")} value={data.receptionDate} onChange={(v) => set("receptionDate", v)} />
            <Field label="Reception Time" type="time" {...venue.fp("receptionTime")} value={data.receptionTime} onChange={(v) => set("receptionTime", v)} />
          </div>
        )}
        <Bilingual enLabel="Venue EN" teLabel="Venue తెలుగు" enField="venueEn" teField="venueTe" data={data} set={set} fp={venue.fp} />
        <Field label="Venue Address" {...venue.fp("venueAddress")} value={data.venueAddress} onChange={(v) => set("venueAddress", v)} />
        <Field label="Google Maps Link" inputMode="url" {...venue.fp("venueMaps")} value={data.venueMaps} onChange={(v) => set("venueMaps", v)} />
      </Section>

      <Section id="seo" icon={Search} title="Link Preview & Custom Link" tag={tagFor("seo")} loading={seo.loading}>
        <SeoSection data={data} set={set} fp={seo.fp} loading={seo.loading} invitationId={invitationId} notify={notify} />
      </Section>

      <Section id="events" icon={CalendarPlus} title="Additional Events" tag={tagFor("events")} loading={events.loading}>
        {!events.loading && data.events.map((ev, i) => (
          <div className="repeat" key={ev.id}>
            <button type="button" className="del" aria-label="Remove event" onClick={() => remove("events", ev.id)}><Trash2 size={15} /></button>
            <div className="sub">Event {i + 1}</div>
            <div className="grid two">
              <Field label="Event Name EN" {...events.fpx(`event-${ev.id}-name`, `event-${i + 1}-name-te`)} value={ev.name} onChange={(v) => patch("events", ev.id, { name: v })} />
              <Field label="Event Name తెలుగు" lang="te" {...events.fpx(`event-${ev.id}-nameTe`, `event-${i + 1}-name-te`)} value={ev.nameTe} onChange={(v) => patch("events", ev.id, { nameTe: v })} />
            </div>
            <div className="grid three">
              <Field label="Date" type="date" {...events.fpx(`event-${ev.id}-date`, `event-${i + 1}-date`)} value={ev.date} onChange={(v) => patch("events", ev.id, { date: v })} />
              <Field label="Time" type="time" {...events.fpx(`event-${ev.id}-time`, `event-${i + 1}-time`)} value={ev.time} onChange={(v) => patch("events", ev.id, { time: v })} />
              <Field label="Venue EN" {...events.fpx(`event-${ev.id}-venue`, `event-${i + 1}-venue-te`)} value={ev.venue} onChange={(v) => patch("events", ev.id, { venue: v })} />
            </div>
            <Field label="Venue తెలుగు" lang="te" {...events.fpx(`event-${ev.id}-venueTe`, `event-${i + 1}-venue-te`)} value={ev.venueTe} onChange={(v) => patch("events", ev.id, { venueTe: v })} />
            <Field label="Google Maps Link" inputMode="url" {...events.fpx(`event-${ev.id}-maps`, `event-${i + 1}-venue-te`)} value={ev.maps} onChange={(v) => patch("events", ev.id, { maps: v })} />
          </div>
        ))}
        {events.loading ? <span className="outline sk-bg" aria-hidden="true"><Plus size={15} /> Add event</span> : data.events.length < 2 ? (
          <button type="button" className="outline" onClick={() => add("events", newEvent)}><Plus size={15} /> Add event</button>
        ) : (
          <div className="hint">This template supports two additional event slots.</div>
        )}
      </Section>

      {!isClient && (
      <Section id="client" icon={Mail} title="Client Access" tag={tagFor("client")} loading={client.loading}>
        <Field
          label="Client email"
          type="email"
          inputMode="email"
          {...client.fp("clientEmail")}
          value={data.clientEmail}
          onChange={(v) => set("clientEmail", v)}
        />
        <div className="hint">
          Optional. Anyone who signs up or signs in with this verified email can see this invitation and request edits at /my.
          Save the invitation with this email; no invite email is needed.
        </div>
        {clientEmailChanged && (
          <div className="hint" role="status" style={{ color: "var(--warn, #b45309)" }}>
            Changing or clearing this email means the previous client loses access and any pending request is cancelled.
          </div>
        )}
      </Section>
      )}
      </fieldset>
    </form>
  );
}
