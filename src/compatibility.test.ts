import { afterEach, describe, it, expect, vi } from "vitest";
import {
  compatibilityMode,
  displaySettings,
  watchReducedMotion,
  showPhotosOnly,
  decodeImage,
} from "./compatibility";
import { defaults } from "./engine";
afterEach(() => vi.unstubAllGlobals());
describe("embedded HTML viewer startup", () => {
  it("loads already decoded images without the newer decode API", async () => {
    await expect(
      decodeImage({ complete: true, naturalWidth: 100 } as HTMLImageElement),
    ).resolves.toBeUndefined();
    await expect(
      decodeImage({ complete: true, naturalWidth: 0 } as HTMLImageElement),
    ).rejects.toThrow("could not load");
  });
  it("starts the full display by default and uses recovery only when explicitly selected", () => {
    vi.stubGlobal("document", { documentElement: { dataset: {} } });
    vi.stubGlobal("location", { hash: "" });
    expect(compatibilityMode()).toBe(false);
    vi.stubGlobal("location", { hash: "#safe" });
    expect(compatibilityMode()).toBe(true);
  });
  it("disables the GPU-heavy effects without mutating saved settings or deadline", () => {
    const saved = { ...defaults, deadline: 12345 };
    const safe = displaySettings(saved, true);
    expect(safe.deadline).toBe(12345);
    expect(safe.density).toBe(0);
    expect(safe.fireworks).toBe(false);
    expect(safe.reduced).toBe(true);
    expect(saved.fireworks).toBe(true);
    expect(saved.reduced).toBe(false);
    expect(displaySettings(saved, false)).toBe(saved);
  });
  it("supports a viewer with no matchMedia", () => {
    vi.stubGlobal("window", {});
    const cleanup = watchReducedMotion(vi.fn());
    expect(cleanup).toBeTypeOf("function");
    cleanup();
  });
  it("uses the legacy media listener when addEventListener is absent", () => {
    const add = vi.fn(),
      remove = vi.fn(),
      change = vi.fn();
    vi.stubGlobal("window", {
      matchMedia: () => ({
        matches: true,
        addListener: add,
        removeListener: remove,
      }),
    });
    const cleanup = watchReducedMotion(change);
    expect(change).toHaveBeenCalledWith(true);
    expect(add).toHaveBeenCalledOnce();
    cleanup();
    expect(remove).toHaveBeenCalledOnce();
  });
  it("does not hide the countdown until a photograph is ready", () => {
    expect(showPhotosOnly("photos", true, false, 600)).toBe(false);
    expect(showPhotosOnly("photos", true, true, 600)).toBe(true);
    expect(showPhotosOnly("photos", false, true, 600)).toBe(false);
  });
  it("keeps standalone photos available during the final minute and after launch", () => {
    expect(showPhotosOnly("photos", true, true, 59)).toBe(true);
    expect(showPhotosOnly("photos", true, true, 0)).toBe(true);
    expect(showPhotosOnly("photos", true, true, 60)).toBe(true);
  });
});
