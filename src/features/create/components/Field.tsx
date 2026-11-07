import React from "react";
import type { HTMLAttributes } from "react";

export interface FieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  help?: string;
  lang?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}

export function Field({ label, name, type = "text", value, onChange, onFocus, onBlur, error, required, help, lang, inputMode }: FieldProps) {
  const id = `f-${name}`;
  return (
    <label className={`f${lang === "te" ? " te" : ""}${error ? " has-err" : ""}`} htmlFor={id}>
      <span>{label}{required && <b className="req" aria-hidden="true"> *</b>}</span>
      <input
        id={id} type={type} lang={lang} inputMode={inputMode} autoComplete="off" value={value ?? ""}
        aria-invalid={!!error} aria-describedby={error ? `${id}-err` : help ? `${id}-help` : undefined}
        onFocus={onFocus} onBlur={onBlur} onChange={(e) => onChange(e.target.value)}
      />
      {error ? <em className="err" id={`${id}-err`}>{error}</em> : help ? <em className="help" id={`${id}-help`}>{help}</em> : null}
    </label>
  );
}
