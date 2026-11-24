import { describe, it, expect } from "vitest";
import { units, loadSettings } from "./engine";
import { countdownLayout } from "./layout";
import { validColor, colorDefaults, rgb } from "./colors";
describe("countdown choreography geometry", () => {
  it.each([
    [1920, 550],
    [3840, 1200],
    [390, 490],
    [320, 360],
    [844, 220],
  ])("keeps every stage inside %sx%s safe area", (w, h) => {
    for (const seconds of [123 * 86400, 86400, 86399, 3600, 3599, 60, 59, 10])
      for (const scale of [0.7, 1, 1.15]) {
        const boxes = countdownLayout(units(seconds), w, h, scale);
        for (const b of boxes) {
          expect(b.x).toBeGreaterThanOrEqual(-0.1);
          expect(b.x + b.width).toBeLessThanOrEqual(w + 0.1);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.y + b.font * 1.04 + 24).toBeLessThanOrEqual(h + 1);
        }
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i],
              b = boxes[j];
            const overlap =
              a.x < b.x + b.width &&
              a.x + a.width > b.x &&
              a.y < b.y + b.font &&
              a.y + a.font > b.y;
            expect(overlap).toBe(false);
          }
      }
  });
  it("removes the leading separator at every unit boundary", () => {
    for (const s of [86400, 86399, 3600, 3599, 60, 59]) {
      const boxes = countdownLayout(units(s), 1920, 550);
      expect(boxes[0].colon).toBe(false);
      expect(boxes.filter((x) => x.colon)).toHaveLength(boxes.length - 1);
    }
  });
  it("preserves surviving unit identities through every stage", () => {
    for (const [a, b] of [
      [86400, 86399],
      [3600, 3599],
      [60, 59],
    ]) {
      const old = countdownLayout(units(a), 1920, 550),
        next = countdownLayout(units(b), 1920, 550);
      expect(next.map((x) => x.id)).toEqual(old.slice(1).map((x) => x.id));
      expect(next[0].font).toBeGreaterThan(old[0].font);
    }
  });
});
describe("custom palette", () => {
  it("validates hex colors", () => {
    expect(validColor("#aB09fF")).toBe(true);
    expect(validColor("red")).toBe(false);
    expect(rgb("#ff8000")).toEqual([255, 128, 0]);
  });
  it("migrates old settings and rejects corrupted colors", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () =>
          JSON.stringify({
            deadline: 123,
            backgroundColor: "invalid",
            confettiColor: "#ff0000",
          }),
      },
    });
    try {
      const { settings } = loadSettings();
      expect(settings.deadline).toBe(123);
      expect(settings.backgroundColor).toBe(colorDefaults.backgroundColor);
      expect(settings.confettiColor).toBe("#ff0000");
      expect(settings.photoOpacity).toBe(0.9);
    } finally {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
