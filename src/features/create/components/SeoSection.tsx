import React, { useState } from "react";
import { Trash2 } from "../../../components/Icons";
import type { InvitationData } from "../../../types/invitation";
import { ApiError, uploadPreviewImage } from "../../../lib/api";
import { compressToOg, ImageError, OG_HEIGHT, OG_WIDTH } from "../../../lib/image";
import { invitationUrl } from "../../../lib/links";
import { SEO_DESC_MAX, SEO_TITLE_MAX } from "../../../lib/validate";
import { Field } from "./Field";
import { DropButton } from "./PhotoPicker";

type FieldProps = (name: string) => {
  name: string; onFocus: () => void; onBlur: () => void; error: string | undefined; loading: boolean;
};

interface Props {
  data: InvitationData;
  set: <K extends keyof InvitationData>(key: K, value: InvitationData[K]) => void;
  fp: FieldProps;
  loading: boolean;
  /** Id this invitation is (or will be) saved under. The preview image file is named after it. */
  invitationId: string;
  notify: (msg: string, tone?: "ok" | "error") => void;
}

const prettyDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

/** What link previews show when the user leaves the fields empty (api/invite.js uses the same wording). */
export function seoFallbacks(data: InvitationData): { title: string; description: string } {
  const groom = data.groomEn.trim() || "Groom";
  const bride = data.brideEn.trim() || "Bride";
  const when = data.weddingDate ? prettyDate(data.weddingDate) : "";
  const where = data.venueEn.trim();
  const head = [when, where].filter(Boolean).join(", ");
  return {
    title: `${groom} & ${bride} Wedding Invitation`,
    description: `${head ? `${head}. ` : ""}Tap to view the invitation.`,
  };
}

export function SeoSection({ data, set, fp, loading, invitationId, notify }: Props) {
  const [uploading, setUploading] = useState(false);
  const slug = data.customId?.trim();
  const fb = seoFallbacks(data);
  const shownTitle = data.seoTitle.trim() || fb.title;
  const shownDesc = data.seoDescription.trim() || fb.description;
  const imageError = fp("seoImage").error;

  const pick = async (files: File[]) => {
    const file = files[0];
    if (!file || uploading) return;
    setUploading(true);
    try {
      const blob = await compressToOg(file);
      set("seoImage", await uploadPreviewImage(blob, invitationId));
    } catch (e) {
      notify(e instanceof ImageError || e instanceof ApiError ? e.message : "Could not upload that image. Try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Field
        label="Custom Link ID" {...fp("customId")} value={data.customId} onChange={(v) => set("customId", v)}
        placeholder="harshajw" maxLength={30}
        help={`Your link: ${invitationUrl(slug || "your-link")}`}
      />

      <Field
        label="Preview title" {...fp("seoTitle")} value={data.seoTitle} onChange={(v) => set("seoTitle", v)}
        placeholder={fb.title} maxLength={SEO_TITLE_MAX} counter
      />

      <label className={`f${fp("seoDescription").error ? " has-err" : ""}`} htmlFor="f-seoDescription">
        <span>Preview description</span>
        <textarea
          id="f-seoDescription" rows={3} value={loading ? "" : data.seoDescription} disabled={loading}
          className={loading ? "sk-bg" : undefined} placeholder={fb.description} maxLength={SEO_DESC_MAX}
          onFocus={fp("seoDescription").onFocus} onBlur={fp("seoDescription").onBlur}
          onChange={(e) => set("seoDescription", e.target.value)}
        />
        {fp("seoDescription").error && <em className="err">{fp("seoDescription").error}</em>}
        {!loading && <small className="counter">{data.seoDescription.length}/{SEO_DESC_MAX}</small>}
      </label>

      <div className="ph">
        <span className="ph-label">Preview image</span>
        {loading ? (
          <div className="ph-drop sk-bg" aria-hidden="true"><span className="ph-ic" /><span><b>Upload image</b></span></div>
        ) : data.seoImage ? (
          <div className="ph-row">
            <div className="ph-item og">
              <img src={data.seoImage} alt="Link preview" />
              <button type="button" className="ph-x" aria-label="Remove preview image" onClick={() => set("seoImage", "")}><Trash2 size={14} /></button>
            </div>
            <DropButton label={uploading ? "Uploading..." : "Replace image"} hint="" onFiles={pick} compact />
          </div>
        ) : (
          <DropButton
            label={uploading ? "Uploading..." : "Upload preview image"}
            hint={`${OG_WIDTH} x ${OG_HEIGHT}, shown in WhatsApp and Instagram. Click or drop an image here`}
            onFiles={pick}
          />
        )}
        {imageError && <em className="err">{imageError}</em>}
      </div>

      <div className="seo-card" aria-label="Link preview example">
        <div className="seo-img">{data.seoImage ? <img src={data.seoImage} alt="" /> : <span>No image yet</span>}</div>
        <div className="seo-text">
          <small>{window.location.host}</small>
          <b>{shownTitle}</b>
          <span>{shownDesc}</span>
        </div>
      </div>
      <div className="hint">This is how WhatsApp and Instagram show your link. Empty fields use the text above.</div>
    </>
  );
}
