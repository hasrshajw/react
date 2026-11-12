import { useEffect, useState } from "react";
import { qrDataUrl } from "../lib/qr";

/** The QR image for `text` as a data: URL. `url` is null while it is being drawn; `failed` is true if drawing failed. */
export function useQr(text: string, size: number) {
  const [state, setState] = useState<{ url: string | null; failed: boolean }>({ url: null, failed: false });
  useEffect(() => {
    let live = true;
    setState({ url: null, failed: false });
    qrDataUrl(text, size).then(
      (url) => { if (live) setState({ url, failed: false }); },
      () => { if (live) setState({ url: null, failed: true }); },
    );
    return () => { live = false; };
  }, [text, size]);
  return state;
}
