import React from "react";
import type { InvitationData } from "../../../types/invitation";
import { Field } from "./Field";

type FieldProps = (name: string) => { name: string; onFocus: () => void; onBlur: () => void; error?: string; loading?: boolean };
interface Props {
  enLabel: string; teLabel: string;
  enField: keyof InvitationData; teField: keyof InvitationData;
  data: InvitationData;
  set: (key: keyof InvitationData, value: string) => void;
  fp: FieldProps;
  required?: boolean;
}

export function Bilingual({ enLabel, teLabel, enField, teField, data, set, fp, required }: Props) {
  return (
    <div className="grid two">
      <Field label={enLabel} required={required} {...fp(enField)} value={data[enField] as string} onChange={(v) => set(enField, v)} />
      <Field label={teLabel} lang="te" {...fp(teField)} value={data[teField] as string} onChange={(v) => set(teField, v)} />
    </div>
  );
}
