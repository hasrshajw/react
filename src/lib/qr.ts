/* M-3: QR codes are drawn in the browser. The link never leaves the page (before, it was sent to api.qrserver.com).
   The `qrcode` library is loaded only when a QR dialog opens, so it is not part of the main bundle. */

export async function qrDataUrl(text: string, size: number): Promise<string> {
  const QR = (await import("qrcode")).default;
  return QR.toDataURL(text, { width: size, margin: 2, errorCorrectionLevel: "M" });
}

/** data: URL -> Blob without fetch(), which the page's connect-src policy would refuse. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] || "image/png";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** PNG file for the Download button (larger than the on-screen image so it prints sharply). */
export async function qrPngBlob(text: string, size = 720): Promise<Blob> {
  return dataUrlToBlob(await qrDataUrl(text, size));
}
