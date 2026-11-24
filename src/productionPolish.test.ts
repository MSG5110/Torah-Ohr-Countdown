import { describe, it, expect } from "vitest";
import {
  focalPoint,
  photoRect,
  photoLuminance,
  adaptiveLighting,
} from "./photoFraming";
import { frameSummary, rehearsalFrame, finalTenCue } from "./operatorEngine";
import { parsePreparedPrize, newPrizeRun, prizePhase } from "./prizeEngine";
import { activeTarget, remaining } from "./engine";
describe("photo composition and adaptation", () => {
  it("supports separate TV and phone focal points and safe legacy defaults", () => {
    expect(focalPoint(undefined, true)).toEqual({ x: 0.5, y: 0.5 });
    const f = { focalX: 0.2, focalY: 0.3, portraitX: 0.8, portraitY: 0.6 };
    expect(focalPoint(f, false)).toEqual({ x: 0.2, y: 0.3 });
    expect(focalPoint(f, true)).toEqual({ x: 0.8, y: 0.6 });
    expect(focalPoint({ focalX: Infinity, focalY: 2 }, false)).toEqual({
      x: 0.5,
      y: 1,
    });
  });
  it("matches native cover + object-position during zoom at portrait/TV sizes", () => {
    for (const [w, h] of [
      [1920, 1080],
      [3840, 2160],
      [390, 844],
      [844, 390],
    ])
      for (const zoom of [1.025, 1.08]) {
        const f = {
            focalX: 0.2,
            focalY: 0.8,
            portraitX: 0.75,
            portraitY: 0.25,
          },
          p = focalPoint(f, w < h),
          r = photoRect(1600, 1000, w, h, zoom, f),
          fit = Math.max(w / 1600, h / 1000);
        expect(r.x).toBeCloseTo(
          (w - 1600 * fit) * p.x * zoom + (w * (1 - zoom)) / 2,
        );
        expect(r.y).toBeCloseTo(
          (h - 1000 * fit) * p.y * zoom + (h * (1 - zoom)) / 2,
        );
        expect(r.x).toBeLessThanOrEqual(0);
        expect(r.y).toBeLessThanOrEqual(0);
        expect(r.x + r.width).toBeGreaterThanOrEqual(w);
        expect(r.y + r.height).toBeGreaterThanOrEqual(h);
      }
  });
  it("measures luminance locally and ignores transparent pixels", () => {
    const mixed = photoLuminance([255, 255, 255, 255, 0, 0, 0, 255]);
    expect(mixed.brightness).toBeCloseTo(0.5);
    expect(mixed.highlights).toBe(0.5);
    expect(photoLuminance([255, 255, 255, 0, 0, 0, 0, 255])).toEqual({
      brightness: 0,
      highlights: 0,
    });
    expect(photoLuminance([]).brightness).toBe(0.4);
  });
  it("reduces flare and increases darkening for bright images, with an off switch", () => {
    const dark = adaptiveLighting({ brightness: 0.1, highlights: 0 }, true),
      bright = adaptiveLighting({ brightness: 0.9, highlights: 0.6 }, true);
    expect(bright.flare).toBeLessThan(dark.flare);
    expect(bright.shade).toBeGreaterThan(dark.shade);
    expect(adaptiveLighting({ brightness: 1, highlights: 1 }, false)).toEqual({
      flare: 1,
      shade: 0,
    });
  });
});
describe("rehearsal and operator metrics", () => {
  it("runs boundaries, final countdown and settled finale, then exits at 40 seconds", () => {
    const started = 100000;
    expect(rehearsalFrame(started, started).preview?.target).toBe(
      started + 864000000,
    );
    expect(rehearsalFrame(started, started + 3000).index).toBe(1);
    const final = rehearsalFrame(started, started + 12000);
    expect(final.index).toBe(4);
    expect(remaining(final.preview!.target, started + 23000)).toBe(0);
    expect(rehearsalFrame(started, started + 39999).done).toBe(false);
    expect(rehearsalFrame(started, started + 40000).done).toBe(true);
    const deadline = 500000;
    expect(activeTarget(deadline, null)).toBe(deadline);
  });
  it("recovers correctly after a sleep jump beyond the rehearsal", () =>
    expect(rehearsalFrame(1000, 864000000).done).toBe(true));
  it("reports frame statistics and excludes invalid samples", () => {
    const a = frameSummary([16, 16, 17, 16, Infinity, NaN]);
    expect(a.fps).toBe(62);
    expect(a.p95).toBe(17);
    expect(a.slow).toBe(0);
    expect(frameSummary([16, 2000]).slow).toBe(1);
    expect(frameSummary([])).toEqual({ fps: 0, p95: 0, slow: 0 });
  });
  it("keeps final-ten beats soft at both ends of every second and neutral at zero", () => {
    for (let n = 1; n <= 10; n++) {
      expect(finalTenCue(n).beat).toBe(0);
      expect(finalTenCue(n - 0.25).beat).toBeGreaterThan(0.9);
      expect(finalTenCue(n - 0.99).beat).toBe(0);
    }
    expect(finalTenCue(0)).toEqual({ build: 1, beat: 0 });
    expect(finalTenCue(11)).toEqual({ build: 0, beat: 0 });
  });
});
describe("prepared prize isolation", () => {
  it("round-trips a next prize without changing the active prize", () => {
    const active = newPrizeRun("a", "First prize", 600, 20, 1000),
      copy = JSON.stringify(active);
    expect(
      parsePreparedPrize(
        JSON.stringify({ prizeId: "b", seconds: 90, revealSeconds: 0 }),
      ),
    ).toEqual({ prizeId: "b", seconds: 90, revealSeconds: 0, revealText: "" });
    expect(JSON.stringify(active)).toBe(copy);
    expect(prizePhase(active, 11000).remaining).toBe(590);
  });
  it("rejects corrupt prepared configurations", () => {
    for (const p of [
      null,
      {},
      { prizeId: 5, seconds: 10, revealSeconds: 0 },
      { prizeId: "x", seconds: 0, revealSeconds: 10 },
    ])
      expect(parsePreparedPrize(JSON.stringify(p))).toBe(null);
  });
});
