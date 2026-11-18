import React from "react";
import type { InvitationData } from "../../../types/invitation";
import { DEFAULT_INVITE_MESSAGE_TE, INVITER_OPTIONS, INVITE_MESSAGE_MAX, inviterLinesTe, inviterMode } from "../../../lib/inviteText";
import { Bilingual } from "./Bilingual";

type FieldProps = (name: string) => { name: string; onFocus: () => void; onBlur: () => void; error?: string; loading?: boolean };
interface Props {
  data: InvitationData;
  set: <K extends keyof InvitationData>(key: K, value: InvitationData[K]) => void;
  fp: FieldProps;
  loading?: boolean;
}

/** Edit the invitation paragraph: the message itself, and who is inviting. */
export function InviteSection({ data, set, fp, loading = false }: Props) {
  const mode = inviterMode(data);
  const msg = fp("inviteMessageTe");
  return (
    <>
      <label className="f te" htmlFor="f-inviteMessageTe">
        <span>Invitation message తెలుగు</span>
        <textarea
          id="f-inviteMessageTe" rows={5} lang="te" value={loading ? "" : data.inviteMessageTe} disabled={loading}
          className={loading ? "sk-bg" : undefined} placeholder={DEFAULT_INVITE_MESSAGE_TE} maxLength={INVITE_MESSAGE_MAX}
          onFocus={msg.onFocus} onBlur={msg.onBlur} onChange={(e) => set("inviteMessageTe", e.target.value)}
        />
        <small className="counter">{loading ? "" : `${data.inviteMessageTe.length}/${INVITE_MESSAGE_MAX}`}</small>
      </label>
      <div className="hint">Leave it empty to use the standard text.</div>
      {!loading && data.inviteMessageTe.trim() !== DEFAULT_INVITE_MESSAGE_TE && (
        <button type="button" className="outline" onClick={() => set("inviteMessageTe", DEFAULT_INVITE_MESSAGE_TE)}>Use the standard text</button>
      )}

      <div className="sub">Who is inviting (ఇట్లు)</div>
      <div className="seg wrap" role="radiogroup" aria-label="Who is inviting">
        {INVITER_OPTIONS.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={mode === o.id} className={mode === o.id ? "on" : undefined} disabled={loading}
            onClick={() => { set("inviterMode", o.id); fp("inviterMode").onFocus(); }}>
            {o.label}
          </button>
        ))}
      </div>
      {mode === "custom" && (
        <Bilingual enLabel="Name EN" teLabel="Name తెలుగు" enField="inviterEn" teField="inviterTe" data={data} set={set as never} fp={fp} />
      )}
      <div className="hint">
        {mode === "surname" && "Shows the family surname after ఇట్లు."}
        {mode === "groom" && "Shows the groom’s parents (or the groom’s name if there are none) after ఇట్లు."}
        {mode === "bride" && "Shows the bride’s parents (or the bride’s name if there are none) after ఇట్లు."}
        {mode === "both" && "Shows the groom’s parents, then the bride’s, after ఇట్లు."}
        {mode === "custom" && "Shows this name after ఇట్లు."}
      </div>
      {!loading && (
        <div className="hint te-preview" lang="te">
          <b>Reads:</b> {data.inviteMessageTe.trim() || DEFAULT_INVITE_MESSAGE_TE}
          {inviterLinesTe(data).length > 0 && <><br />ఇట్లు<br />{inviterLinesTe(data).map((l, i) => <span key={i}>{l}<br /></span>)}</>}
        </div>
      )}
    </>
  );
}
