import { describe, it, expect } from "vitest";
import { backgroundSize, coverFrame, toneCurve } from "./backgroundPhoto";
describe("photographic background composition", () => {
  it.each([
    [1920, 1080],
    [3840, 2160],
    [390, 844],
    [844, 390],
  ])("covers %sx%s without blank edges while drifting", (width, height) => {
    for (const time of [0, 20, 100, 864000])
      for (const reduced of [true, false]) {
        const r = coverFrame(1672, 941, width, height, time, reduced);
        expect(r.x).toBeLessThanOrEqual(0);
        expect(r.y).toBeLessThanOrEqual(0);
        expect(r.x + r.width).toBeGreaterThanOrEqual(width);
        expect(r.y + r.height).toBeGreaterThanOrEqual(height);
        expect(r.width / r.height).toBeCloseTo(1672 / 941, 6);
      }
  });
  it("keeps image rendering inside its pixel budget", () => {
    for (const quality of ["auto", "high", "low"]) {
      const size = backgroundSize(3840, 2160, quality);
      expect(size.width * size.height).toBeLessThan(
        quality === "high" ? 2110000 : quality === "low" ? 610000 : 1310000,
      );
    }
  });
  it("maps dark tones and highlights to the selected theme", () => {
    const curve = toneCurve("#050608", "#20252e", "#f0f5ff");
    expect(Array.from(curve.slice(0, 3))).toEqual([5, 6, 8]);
    expect(Array.from(curve.slice(765, 768))).toEqual([240, 245, 255]);
    expect(curve.every((v) => v >= 0 && v <= 255)).toBe(true);
  });
  it("keeps reduced-motion framing static at every elapsed time", () => {
    expect(coverFrame(1672, 941, 1920, 1080, 0, true)).toEqual(
      coverFrame(1672, 941, 1920, 1080, 99999, true),
    );
  });
});

describe("portrait photographic art direction", () => {
  it("retains the warm side-light rather than cropping it entirely away", () => {
    const r = coverFrame(1672, 941, 390, 844, 0, false);
    const lightX = r.x + r.width * 0.12;
    expect(lightX).toBeGreaterThanOrEqual(0);
    expect(lightX).toBeLessThan(390 * 0.3);
  });
});

describe("living atmosphere motion", () => {
  it("moves the lighting and haze independently", async () => {
    const { lightMotion, hazeMotion } = await import("./backgroundPhoto");
    expect(lightMotion(0, false)).not.toEqual(lightMotion(10, false));
    expect(hazeMotion(0, 0, false)).not.toEqual(hazeMotion(10, 0, false));
    expect(hazeMotion(10, 0, false)).not.toEqual(hazeMotion(10, 1, false));
  });
  it("keeps moving light strength bounded with no sharp frame changes", async () => {
    const { lightMotion } = await import("./backgroundPhoto");
    for (let t = 0; t < 100; t += 0.1) {
      const a = lightMotion(t, false),
        b = lightMotion(t + 0.1, false);
      expect(a.strength).toBeGreaterThan(0.65);
      expect(a.strength).toBeLessThan(1);
      expect(Math.abs(a.strength - b.strength)).toBeLessThan(0.003);
    }
  });
  it("freezes every added atmosphere layer for reduced motion", async () => {
    const { lightMotion, hazeMotion } = await import("./backgroundPhoto");
    expect(lightMotion(0, true)).toEqual(lightMotion(100, true));
    for (let i = 0; i < 4; i++)
      expect(hazeMotion(0, i, true)).toEqual(hazeMotion(100, i, true));
  });
  it("maintains overscan throughout a dense sample of camera movement", () => {
    for (let t = 0; t < 500; t += 1.7)
      for (const [width, height] of [
        [1920, 1080],
        [390, 844],
        [844, 390],
      ]) {
        const r = coverFrame(1672, 941, width, height, t, false);
        expect(r.x).toBeLessThanOrEqual(0);
        expect(r.y).toBeLessThanOrEqual(0);
        expect(r.x + r.width).toBeGreaterThanOrEqual(width);
        expect(r.y + r.height).toBeGreaterThanOrEqual(height);
      }
  });
});

describe("animated light shafts", () => {
  it("gives each feathered ray its own direction and motion", async () => {
    const { rayMotion } = await import("./backgroundPhoto");
    expect(rayMotion(0, 0, false)).not.toEqual(rayMotion(10, 0, false));
    expect(rayMotion(10, 0, false)).not.toEqual(rayMotion(10, 1, false));
  });
  it("keeps rays bounded and freezes them under reduced motion", async () => {
    const { rayMotion } = await import("./backgroundPhoto");
    for (let i = 0; i < 3; i++) {
      expect(rayMotion(0, i, true)).toEqual(rayMotion(100, i, true));
      for (let t = 0; t < 120; t += 0.2) {
        const ray = rayMotion(t, i, false),
          next = rayMotion(t + 0.1, i, false);
        expect(ray.opacity).toBeGreaterThan(0.1);
        expect(ray.opacity).toBeLessThan(0.3);
        expect(Math.abs(ray.angle - next.angle)).toBeLessThan(0.002);
      }
    }
  });
});
