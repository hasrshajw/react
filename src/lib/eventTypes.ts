/* T6: event presets for the "Additional Events" list. The type only fills the name while the name is still empty
   (see the form); an empty type means "no preset" and is what every record saved before T6 has. */
export const MAX_EVENTS = 6;

export interface EventTypeDef { id: string; label: string; nameEn: string; nameTe: string }

export const EVENT_TYPES: EventTypeDef[] = [
  { id: "engagement", label: "Engagement", nameEn: "Engagement", nameTe: "నిశ్చితార్థం" },
  { id: "haldi", label: "Haldi", nameEn: "Haldi", nameTe: "పసుపు వేడుక" },
  { id: "mehendi", label: "Mehendi", nameEn: "Mehendi", nameTe: "మెహందీ" },
  { id: "sangeet", label: "Sangeet", nameEn: "Sangeet", nameTe: "సంగీత్" },
  { id: "pellikoduku", label: "Pellikoduku", nameEn: "Pellikoduku", nameTe: "పెళ్ళికొడుకు వేడుక" },
  { id: "pellikuthuru", label: "Pellikuthuru", nameEn: "Pellikuthuru", nameTe: "పెళ్ళికూతురు వేడుక" },
  { id: "varapuja", label: "Vara Puja", nameEn: "Vara Puja", nameTe: "వరపూజ" },
  { id: "baraat", label: "Baraat", nameEn: "Baraat", nameTe: "బరాత్" },
  { id: "dinner", label: "Dinner", nameEn: "Dinner", nameTe: "విందు" },
  { id: "griha", label: "Griha Pravesham", nameEn: "Griha Pravesham", nameTe: "గృహప్రవేశం" },
  { id: "custom", label: "Custom", nameEn: "", nameTe: "" },
];

export const EVENT_TYPE_IDS: string[] = EVENT_TYPES.map((t) => t.id);
/** "" (no preset) or a known id. Anything else (pasted or damaged data) is not valid. */
export const okEventType = (v: unknown): boolean => v === undefined || v === null || v === "" || (typeof v === "string" && EVENT_TYPE_IDS.includes(v));
export const eventTypeDef = (id: unknown): EventTypeDef | undefined => EVENT_TYPES.find((t) => t.id === id);

/** What choosing `type` does to an event: the preset names are filled only into names that are still empty. */
export function applyEventType(ev: { name: string; nameTe: string }, type: string): { type: string; name?: string; nameTe?: string } {
  const def = eventTypeDef(type);
  const out: { type: string; name?: string; nameTe?: string } = { type };
  if (def) {
    if (!ev.name.trim() && def.nameEn) out.name = def.nameEn;
    if (!ev.nameTe.trim() && def.nameTe) out.nameTe = def.nameTe;
  }
  return out;
}
