import React, { useRef, useState } from "react";
import { Image as ImageIcon, Plus, X } from "../../../components/Icons";
import { ACCEPT_ATTR, compressImage, ImageError, MAX_GALLERY } from "../../../lib/image";

interface BaseProps {
  label: string;
  onError: (msg: string) => void;
  onFocus?: () => void;
  /** Whether a photo exists is unknown while the invitation loads. */
  loading?: boolean;
}

async function toDataUrl(file: File, maxSide: number, onError: (m: string) => void): Promise<string | null> {
  try {
    return await compressImage(file, maxSide);
  } catch (e) {
    onError(e instanceof ImageError ? e.message : "Could not add that image.");
    return null;
  }
}

export function DropButton({ label, hint, multiple, onFiles, className = "", compact = false }: {
  label: string; hint: string; multiple?: boolean; onFiles: (files: File[]) => void; className?: string; compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <button
        type="button" className={`ph-drop ${compact ? "ph-add " : ""}${over ? "over " : ""}${className}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
      >
        <span className="ph-ic">{compact ? <Plus size={18} /> : <ImageIcon size={20} />}</span>
        <span><b>{label}</b>{!compact && <small>{hint}</small>}</span>
      </button>
      <input
        ref={input} type="file" accept={ACCEPT_ATTR} multiple={multiple} hidden
        onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }}
      />
    </>
  );
}

function PhotoGhost({ label }: { label: string }) {
  return (
    <div className="ph" aria-hidden="true">
      <span className="ph-label">{label}</span>
      <div className="ph-drop sk-bg">
        <span className="ph-ic" />
        <span><b>Upload photo</b><small>Click or drop an image here</small></span>
      </div>
    </div>
  );
}

export function PhotoPicker({ label, value, onChange, onError, onFocus, loading = false, maxSide = 1000, help }: BaseProps & {
  value: string; onChange: (v: string) => void; maxSide?: number; help?: string;
}) {
  if (loading) return <PhotoGhost label={label} />;
  const pick = async (files: File[]) => {
    onFocus?.();
    if (!files[0]) return;
    const url = await toDataUrl(files[0], maxSide, onError);
    if (url) onChange(url);
  };
  return (
    <div className="ph">
      <span className="ph-label">{label}</span>
      {value ? (
        <div className="ph-row">
          <div className="ph-item wide">
            <img src={value} alt={label} />
            <button type="button" className="ph-x" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange("")}><X size={14} /></button>
          </div>
          <DropButton label="Replace photo" hint="" onFiles={pick} compact />
        </div>
      ) : (
        <DropButton label="Upload photo" hint={help ?? "Click or drop an image here"} onFiles={pick} />
      )}
    </div>
  );
}

export function GalleryPicker({ label, value, onChange, onError, onFocus, loading = false }: BaseProps & {
  value: string[]; onChange: (v: string[]) => void;
}) {
  if (loading) return <PhotoGhost label={label} />;
  const pick = async (files: File[]) => {
    onFocus?.();
    const room = MAX_GALLERY - value.length;
    if (files.length > room) onError(`Only ${MAX_GALLERY} gallery photos fit. Extra images were skipped.`);
    const next: string[] = [];
    for (const f of files.slice(0, Math.max(0, room))) {
      const url = await toDataUrl(f, 800, onError);
      if (url) next.push(url);
    }
    if (next.length) onChange([...value, ...next]);
  };
  return (
    <div className="ph">
      <span className="ph-label">{label} <span className="ph-count">({value.length}/{MAX_GALLERY})</span></span>
      <div className="ph-row">
        {value.map((src, i) => (
          <div className="ph-item" key={i}>
            <img src={src} alt={`Gallery photo ${i + 1}`} />
            <button type="button" className="ph-x" aria-label={`Remove gallery photo ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X size={14} /></button>
          </div>
        ))}
        {value.length < MAX_GALLERY && <DropButton label="Add photos" hint="" multiple onFiles={pick} compact />}
      </div>
    </div>
  );
}
