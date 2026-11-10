/* Image upload helpers: validate, downscale and re-encode as JPEG so a photo
   stays small enough to be stored inside the invitation record in Supabase. */
export const MAX_GALLERY = 4;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export class ImageError extends Error {}

export const ACCEPT_ATTR = ACCEPTED.join(",");

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new ImageError("That file could not be read as an image.")); };
    img.src = url;
  });
}

/** Resolves to a JPEG data URL no larger than `maxSide` px on its longest side. */
export async function compressImage(file: File, maxSide = 1000, quality = 0.78): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new ImageError("Use a JPG, PNG or WebP image.");
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("Image is larger than 12 MB. Pick a smaller one.");
  const img = await load(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Your browser could not process this image.");
  ctx.fillStyle = "#fff"; /* PNG transparency -> white, JPEG has no alpha */
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/* Link preview image (og:image). WhatsApp ignores previews larger than about 300 KB. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_MAX_BYTES = 300 * 1024;

const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

/** Center-crops to 1200 x 630 and exports a JPEG under 300 KB (lowers quality, then size, until it fits). */
export async function compressToOg(file: File): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new ImageError("Use a JPG, PNG or WebP image.");
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("Image is larger than 12 MB. Pick a smaller one.");
  const img = await load(file);
  /* "cover" crop: scale so both sides are filled, then cut the overflow equally from both ends. */
  const ratio = OG_WIDTH / OG_HEIGHT;
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const sw = srcRatio > ratio ? img.naturalHeight * ratio : img.naturalWidth;
  const sh = srcRatio > ratio ? img.naturalHeight : img.naturalWidth / ratio;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;

  for (const scale of [1, 0.85, 0.7]) {
    const w = Math.round(OG_WIDTH * scale), h = Math.round(OG_HEIGHT * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageError("Your browser could not process this image.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
      const blob = await toBlob(canvas, q);
      if (blob && blob.size <= OG_MAX_BYTES) return blob;
    }
  }
  throw new ImageError("This image is too detailed to shrink under 300 KB. Try a simpler picture.");
}
