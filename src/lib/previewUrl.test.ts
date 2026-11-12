import { describe, expect, it } from "vitest";
import { isOwnPreviewImage } from "./previewUrl";

const BASE = "https://abc.supabase.co";
const OK = `${BASE}/storage/v1/object/public/invitation-previews/u1/inv9.jpg`;

describe("isOwnPreviewImage (M-4)", () => {
  it.each([OK, `${OK}?v=1731400000`])("accepts %s", (v) => expect(isOwnPreviewImage(v, BASE)).toBe(true));

  it.each([
    ["other host", "https://evil.test/storage/v1/object/public/invitation-previews/u1/a.jpg"],
    ["other bucket", `${BASE}/storage/v1/object/public/other/u1/a.jpg`],
    ["png", `${BASE}/storage/v1/object/public/invitation-previews/u1/a.png`],
    ["http", OK.replace("https", "http")],
    ["user info", OK.replace("https://", "https://u:p@")],
    ["extra folder", `${BASE}/storage/v1/object/public/invitation-previews/u1/x/a.jpg`],
    ["other query", `${OK}?token=1`],
    ["fragment", `${OK}#x`],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:image/jpeg;base64,AAAA"],
    ["leading space", ` ${OK}`],
    ["no user folder", `${BASE}/storage/v1/object/public/invitation-previews/a.jpg`],
    ["empty", ""],
  ])("rejects %s", (_name, v) => expect(isOwnPreviewImage(v, BASE)).toBe(false));

  it("rejects everything when no Supabase URL is configured", () => expect(isOwnPreviewImage(OK, "")).toBe(false));
});
