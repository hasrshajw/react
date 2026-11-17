// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "./test/renderHook";
import { Theme } from "@astryxdesign/core/theme";
import { Button } from "@astryxdesign/core/Button";
import { themes, defaultThemeSlug } from "./astryx-themes";

/* Foundation smoke test (Astryx stage 1/2): the Schedy theme resolves and an Astryx component renders inside it. */
describe("Astryx foundation", () => {
  it("renders an Astryx Button inside the Schedy theme", () => {
    expect(defaultThemeSlug).toBe("schedy");
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    act(() => {
      root.render(<Theme theme={themes[defaultThemeSlug]} mode="light"><Button label="Hello Astryx" /></Theme>);
    });
    expect(el.textContent).toContain("Hello Astryx");
    act(() => root.unmount());
    el.remove();
  });
});
