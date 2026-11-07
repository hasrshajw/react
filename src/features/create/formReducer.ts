import type { ContactItem, EventItem, InvitationData, ListField } from "../../types/invitation";
import { initial } from "./constants";

/* All form state lives in one reducer, so every change is a named action and
   related fields (data, snapshot, touched, submitted) can never drift apart. */
export interface FormState {
  data: InvitationData;
  /** JSON of the last saved data; `dirty` is data !== snap. */
  snap: string;
  touched: Record<string, boolean>;
  submitted: boolean;
  editId: string | null;
  categoryId: string;
  lastSaved: number | null;
}

type ListItem = EventItem | ContactItem;

export type FormAction =
  | { type: "field"; key: keyof InvitationData; value: InvitationData[keyof InvitationData] }
  | { type: "addItem"; field: ListField; item: ListItem }
  | { type: "patchItem"; field: ListField; id: string; patch: Partial<ListItem> }
  | { type: "removeItem"; field: ListField; id: string }
  | { type: "load"; data: InvitationData }
  | { type: "replaceData"; data: InvitationData }
  | { type: "touch"; key: string }
  | { type: "submit" }
  | { type: "saved"; editId: string; at: number }
  | { type: "category"; id: string }
  | { type: "reset" };

export const snapshot = (d: InvitationData) => JSON.stringify(d);

export const initialFormState = (editId: string | null): FormState => ({
  data: initial, snap: snapshot(initial), touched: {}, submitted: false, editId, categoryId: "ALL", lastSaved: null,
});

const mapList = <T extends ListItem>(list: T[], id: string, fn: (x: T) => T) => list.map((x) => (x.id === id ? fn(x) : x));

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "field":
      if (state.data[action.key] === action.value) return state;
      return { ...state, data: { ...state.data, [action.key]: action.value } };
    case "addItem":
      return { ...state, data: { ...state.data, [action.field]: [...(state.data[action.field] as ListItem[]), action.item] } };
    case "patchItem":
      return { ...state, data: { ...state.data, [action.field]: mapList(state.data[action.field] as ListItem[], action.id, (x) => ({ ...x, ...action.patch })) } };
    case "removeItem":
      return { ...state, data: { ...state.data, [action.field]: (state.data[action.field] as ListItem[]).filter((x) => x.id !== action.id) } };
    case "load":
      return { ...state, data: action.data, snap: snapshot(action.data) };
    case "replaceData":
      return { ...state, data: action.data };
    case "touch":
      return state.touched[action.key] ? state : { ...state, touched: { ...state.touched, [action.key]: true } };
    case "submit":
      return state.submitted ? state : { ...state, submitted: true };
    case "saved":
      return { ...state, editId: action.editId, snap: snapshot(state.data), lastSaved: action.at };
    case "category":
      return { ...state, categoryId: action.id };
    case "reset":
      return { ...initialFormState(null) };
  }
}
