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
