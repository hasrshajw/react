import React from "react";
import type { HTMLAttributes } from "react";
import { SkText } from "../../../components/Skeleton";

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
  /** The label is static; the value comes from the server, so the input shows as a ghost until it arrives. */
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** Show a "used / max" counter (needs maxLength). */
  counter?: boolean;
}

export function Field({ label, name, type = "text", value, onChange, onFocus, onBlur, error, required, help, lang, inputMode, loading = false, placeholder, maxLength, counter = false }: FieldProps) {
  const id = `f-${name}`;
  const describedBy = error ? `${id}-err` : help ? `${id}-help` : undefined;
  return (
    <div className={`f${lang === "te" ? " te" : ""}${error ? " has-err" : ""}`}>
      <label htmlFor={id}>{label}{required && <b className="req" aria-hidden="true"> *</b>}</label>
      <input
        id={id} type={type} lang={lang} inputMode={inputMode} autoComplete="off" value={loading ? "" : value ?? ""}
        className={loading ? "sk-bg" : undefined} disabled={loading} placeholder={loading ? "" : placeholder} maxLength={maxLength}
        aria-required={required || undefined} aria-invalid={!!error} aria-describedby={describedBy}
        onFocus={onFocus} onBlur={onBlur} onChange={(e) => onChange(e.target.value)}
      />
      {loading ? (help ? <em className="help" aria-hidden="true"><SkText w={32} /></em> : null) : error ? <em className="err" id={`${id}-err`} role="alert">{error}</em> : help ? <em className="help" id={`${id}-help`}>{help}</em> : null}
      {!loading && counter && maxLength ? <small className="counter" aria-hidden="true">{(value ?? "").length}/{maxLength}</small> : null}
    </div>
  );
}
