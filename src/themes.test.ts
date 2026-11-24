import { describe, it, expect, vi, afterEach } from "vitest";
import { themes, themePatch, sceneFor } from "./themes";
import { colorDefaults, validColor } from "./colors";
import { loadSettings } from "./engine";
import { countdownIntensity } from "./cinema";
afterEach(() => vi.unstubAllGlobals());
function saved(data: unknown) {
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(data) });
  return loadSettings().settings;
}
describe("coordinated display themes", () => {
  it("provides seven complete palettes with a white-number emerald variant", () => {
    expect(themes).toHaveLength(7);
    expect(new Set(themes.map((t) => t.id)).size).toBe(7);
    expect(new Set(themes.map((t) => t.palette.backgroundColor)).size).toBe(6);
    for (const theme of themes) {
      expect(Object.keys(theme.palette).sort()).toEqual(
        Object.keys(colorDefaults).sort(),
      );
      expect(Object.values(theme.palette).every(validColor)).toBe(true);
      expect(sceneFor(theme.id)).toBe(theme.scene);
    }
  });
  it("keeps the emerald scene and every effect color when only the numbers are white", () => {
    const original = themePatch("emerald"),
      white = themePatch("emerald-white");
    expect(white.digitColor).toBe("#ffffff");
    for (const key of Object.keys(
      colorDefaults,
    ) as (keyof typeof colorDefaults)[]) {
      if (key !== "digitColor") expect(white[key]).toBe(original[key]);
    }
    expect(sceneFor("emerald-white")).toBe(sceneFor("emerald"));
    expect(saved({ theme: "emerald-white" }).digitColor).toBe("#ffffff");
  });
  it("switches every palette field with one choice", () => {
    for (const theme of themes) {
      const patch = themePatch(theme.id);
      expect(patch.theme).toBe(theme.id);
      for (const key of Object.keys(
        colorDefaults,
      ) as (keyof typeof colorDefaults)[])
        expect(patch[key]).toBe(theme.palette[key]);
    }
  });
  it("restores a selected theme consistently while retaining event and gallery options", () => {
    const s = saved({
      theme: "sapphire",
      deadline: 12345,
      duration: 32,
      slideshow: true,
      digitColor: "#ff0000",
    });
    expect(s.theme).toBe("sapphire");
    expect(s.digitColor).toBe(themePatch("sapphire").digitColor);
    expect(s.deadline).toBe(12345);
    expect(s.duration).toBe(32);
    expect(s.slideshow).toBe(true);
  });
  it("preserves legacy custom colors until a theme is chosen", () => {
    const s = saved({ deadline: 12345, confettiColor: "#ff0000" });
    expect(s.theme).toBe("saved");
    expect(s.confettiColor).toBe("#ff0000");
    expect(s.deadline).toBe(12345);
  });
  it("recovers an unknown theme without changing the deadline", () => {
    const s = saved({ theme: "missing", deadline: 12345 });
    expect(s.theme).toBe("emerald");
    expect(s.deadline).toBe(12345);
    expect(s.digitColor).toBe(colorDefaults.digitColor);
  });
});
describe("continuous countdown intensity", () => {
  it("builds monotonically from calm to the launch", () => {
    let last = 0;
    for (let s = 86400; s >= 0; s -= 5) {
      const intensity = countdownIntensity(s);
      expect(intensity).toBeGreaterThanOrEqual(last - 1e-12);
      expect(intensity).toBeLessThanOrEqual(4.5);
      last = intensity;
    }
    expect(countdownIntensity(0)).toBeCloseTo(4.5);
    expect(countdownIntensity(-10)).toBeCloseTo(4.5);
  });
  it.each([86400, 3600, 300, 60, 20, 10])(
    "has no brightness step at %s seconds",
    (s) => {
      expect(
        Math.abs(countdownIntensity(s - 0.001) - countdownIntensity(s + 0.001)),
      ).toBeLessThan(0.001);
    },
  );
  it("changes only a small amount in any tenth of a second in the final minute", () => {
    for (let s = 60; s > 0.1; s -= 0.1)
      expect(countdownIntensity(s - 0.1) - countdownIntensity(s)).toBeLessThan(
        0.02,
      );
  });
});
