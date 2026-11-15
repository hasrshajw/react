// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "../test/renderHook";
import { useBackClose } from "./useBackClose";

let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.useFakeTimers(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

function Layer({ active, onBack }: { active: boolean; onBack: () => void }) {
  useBackClose(active, onBack);
  return null;
}
const settle = () => act(() => { vi.runAllTimers(); });
const pop = () => act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });

describe("useBackClose", () => {
  it("pushes one history entry while active and calls back on a back action", () => {
    const before = window.history.length;
    const onBack = vi.fn();
    act(() => root.render(<Layer active onBack={onBack} />));
    settle();
    expect(window.history.length).toBe(before + 1);
    pop();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("does nothing while inactive", () => {
    const before = window.history.length;
    const onBack = vi.fn();
    act(() => root.render(<Layer active={false} onBack={onBack} />));
    settle();
    pop();
    expect(window.history.length).toBe(before);
    expect(onBack).not.toHaveBeenCalled();
  });

  it("closing by hand takes its own entry back", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    act(() => root.render(<Layer active onBack={() => {}} />));
    settle();
    act(() => root.render(<Layer active={false} onBack={() => {}} />));
    settle();
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it("a layer swapped for another in the same commit keeps the entry (no back call)", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const before = window.history.length;
    act(() => root.render(<Layer active onBack={() => {}} />));
    settle();
    act(() => root.render(<><Layer active={false} onBack={() => {}} /><Layer active onBack={() => {}} /></>));
    settle();
    expect(back).not.toHaveBeenCalled();
    expect(window.history.length).toBe(before + 1);
    back.mockRestore();
  });
});
