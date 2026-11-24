import { describe, it, expect, vi, afterEach } from "vitest";
import {
  revealField,
  revealAlpha,
  featherFor,
  filmEase,
  chooseTransition,
  photoTransitions,
  entryPose,
  washFrame,
  type FieldStyle,
  type TransitionStyle,
} from "./photoTransitions";
import { defaults, loadSettings } from "./engine";
afterEach(() => vi.unstubAllGlobals());
describe("new cinematic transition fields", () => {
  it.each(["veil", "lumen", "wash", "ink"] as FieldStyle[])(
    "$0 starts clear, finishes opaque and never reverses",
    (style) => {
      const field = revealField(style, 80, 45, 17),
        feather = featherFor(style);
      for (const value of field) {
        expect(Number.isFinite(value)).toBe(true);
        expect(revealAlpha(value, 0, feather)).toBe(0);
        expect(revealAlpha(value, 1, feather)).toBe(1);
        expect(revealAlpha(value, 0.975, feather)).toBe(1);
        let previous = 0;
        for (let step = 0; step <= 20; step++) {
          const alpha = revealAlpha(value, filmEase(step / 20), feather);
          expect(alpha).toBeGreaterThanOrEqual(previous);
          previous = alpha;
        }
      }
      const midway = Array.from(field, (v) => revealAlpha(v, 0.5, feather));
      const coverage = midway.reduce((a, b) => a + b, 0) / midway.length;
      expect(coverage).toBeGreaterThan(0.12);
      expect(coverage).toBeLessThan(0.9);
      expect(midway.filter((a) => a > 0 && a < 1).length).toBeGreaterThan(100);
    },
  );
  it.each([
    [96, 54],
    [54, 96],
    [120, 40],
    [40, 120],
    [1, 1],
  ])("keeps fields finite and varied at %i × %i", (w, h) => {
    for (const style of ["veil", "lumen", "wash", "ink"] as FieldStyle[]) {
      const field = revealField(style, w, h, 3);
      expect(
        Array.from(field).every((a) => Number.isFinite(a) && a > 0 && a < 1),
      ).toBe(true);
      if (w * h > 1) expect(field).not.toEqual(revealField(style, w, h, 4));
    }
  });
  it("gives the watercolour a persistent soft frame with clear corners and opaque center", () => {
    for (const [w, h] of [
      [160, 90],
      [90, 160],
    ]) {
      const a = washFrame(w, h, 3),
        b = washFrame(w, h, 4);
      expect(a[0]).toBe(0);
      expect(a[a.length - 1]).toBe(0);
      expect(a[Math.floor(h / 2) * w + Math.floor(w / 2)]).toBe(1);
      expect(
        Array.from(a).every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
      ).toBe(true);
      expect(Array.from(a).some((v) => v > 0 && v < 1)).toBe(true);
      expect(a).not.toEqual(b);
    }
  });
  it("changes varied-mode styles without back-to-back repeats", () => {
    let previous: TransitionStyle | undefined;
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      const next = chooseTransition("varied", i, previous);
      expect(next).not.toBe(previous);
      seen.add(next);
      previous = next;
    }
    expect(seen.size).toBe(6);
  });
  it("uses smooth bounded timing with zero speed at both endpoints", () => {
    let old = 0;
    for (let i = 0; i <= 100; i++) {
      const p = filmEase(i / 100);
      expect(p).toBeGreaterThanOrEqual(old);
      expect(p).toBeLessThanOrEqual(1);
      old = p;
    }
    expect(filmEase(0.001)).toBeLessThan(0.00001);
    expect(1 - filmEase(0.999)).toBeLessThan(0.00001);
    for (const style of [
      "velvet",
      "glide",
      "veil",
      "lumen",
      "wash",
      "ink",
    ] as TransitionStyle[]) {
      const pose = entryPose(style, 4);
      expect(entryPose(style, 4).to).toBe(
        `translate(0%, 0%) scale(${style === "glide" ? 1.035 : 1})`,
      );
      expect(pose.from.match(/scale\(([^)]+)\)/)?.[1]).toBe(
        pose.to.match(/scale\(([^)]+)\)/)?.[1],
      );
    }
  });
});
describe("replacement transition preferences", () => {
  it.each(photoTransitions)("restores $label", ({ id }) => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({ photoTransition: id }),
    });
    expect(loadSettings().settings.photoTransition).toBe(id);
  });
  it("removes old choices while preserving the campaign and other saved settings", () => {
    for (const id of [
      "brush",
      "crossfade",
      "mist",
      "wipe",
      "iris",
      "unknown",
    ]) {
      vi.stubGlobal("localStorage", {
        getItem: () =>
          JSON.stringify({
            photoTransition: id,
            deadline: 123456,
            duration: 30,
          }),
      });
      const s = loadSettings().settings;
      expect(s.photoTransition).toBe("velvet");
      expect(s.deadline).toBe(123456);
      expect(s.duration).toBe(30);
    }
    expect(defaults.photoTransition).toBe("velvet");
    expect(photoTransitions.map((t) => t.id)).toEqual([
      "velvet",
      "glide",
      "veil",
      "lumen",
      "wash",
      "ink",
      "varied",
    ]);
  });
});
