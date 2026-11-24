import { describe, it, expect } from "vitest";
import { launchTimeline, shells, clamp01 } from "./cinema";
describe("cinematic launch orchestration", () => {
  it("keeps every stage idle before zero", () => {
    const t = launchTimeline(-10);
    expect(t.release).toBe(0);
    expect(t.logo).toBe(0);
    expect(t.title).toBe(0);
    expect(t.fireworks).toBe(false);
    expect(t.confetti).toBe(false);
  });
  it("reveals the logo before the message", () => {
    expect(launchTimeline(1.79).logo).toBe(0);
    expect(launchTimeline(3).logo).toBeGreaterThan(0);
    expect(launchTimeline(2.64).title).toBe(0);
    expect(launchTimeline(4).title).toBeGreaterThan(0);
  });
  it("starts falling confetti with the first fireworks cue", () => {
    expect(launchTimeline(shells[0] - 0.001).confetti).toBe(false);
    expect(launchTimeline(shells[0] - 0.001).fireworks).toBe(false);
    for (const time of [shells[0], 1.3, 3, 4, 9.39]) {
      expect(launchTimeline(time).confetti).toBe(true);
      expect(launchTimeline(time).fireworks).toBe(true);
    }
    expect(launchTimeline(11.5).confetti).toBe(false);
  });
  it("settles permanently after the celebration with no replay emissions", () => {
    for (const t of [16, 60, 864000]) {
      const s = launchTimeline(t);
      expect(s.settle).toBe(1);
      expect(s.fireworks).toBe(false);
      expect(s.confetti).toBe(false);
      expect(s.logo).toBe(1);
      expect(s.title).toBe(1);
    }
  });
  it("places every shell inside the launch window with varied coordinated pairs", () => {
    expect(shells[0]).toBeGreaterThanOrEqual(0.65);
    expect(shells[shells.length - 1]).toBeLessThan(9.4);
    for (let i = 1; i < shells.length; i++)
      expect(shells[i]).toBeGreaterThan(shells[i - 1]);
    expect(shells.some((t, i) => i > 0 && t - shells[i - 1] < 0.25)).toBe(true);
  });
  it("clamps transition envelopes against clock skips and past deadlines", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(launchTimeline(100000).release).toBe(1);
  });
});

describe("bundled typography metrics", () => {
  it("uses the full tabular glyph advance without clipping numeral edges", async () => {
    const { countdownLayout } = await import("./layout");
    const layout = countdownLayout([{ id: "seconds", value: 44 }], 1920, 700);
    expect(layout[0].width / layout[0].font).toBeCloseTo(1.04);
  });
});

describe("zero holds its countdown position", () => {
  it("keeps identical geometry from the last second through zero", async () => {
    const { countdownLayout } = await import("./layout");
    const { units } = await import("./engine");
    for (const [w, h] of [
      [1920, 600],
      [3840, 1200],
      [390, 550],
      [844, 230],
    ]) {
      const before = countdownLayout(units(1), w, h),
        atZero = countdownLayout(units(0), w, h);
      expect(before.map(({ value, ...rect }) => rect)).toEqual(
        atZero.map(({ value, ...rect }) => rect),
      );
      expect(atZero[0].value).toBe(0);
    }
  });
  it("holds zero before fading smoothly without a separate transform", async () => {
    const { zeroOpacity } = await import("./cinema");
    expect(zeroOpacity(0)).toBe(1);
    expect(zeroOpacity(0.6)).toBe(1);
    expect(zeroOpacity(0.65)).toBe(1);
    expect(zeroOpacity(1.525)).toBeCloseTo(0.5);
    expect(zeroOpacity(2.4)).toBeCloseTo(0);
    expect(zeroOpacity(2.65)).toBe(0);
    let previous = 1;
    for (let t = 0; t < 2.7; t += 0.02) {
      const opacity = zeroOpacity(t);
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(previous);
      previous = opacity;
    }
  });
});

describe("final-ten pulse", () => {
  it("pulses only positive numbers in the final ten", async () => {
    const { pulseStrength } = await import("./cinema");
    for (const s of [-2, 0, 11, 60]) expect(pulseStrength(s)).toBe(0);
    for (let s = 1; s <= 10; s++) expect(pulseStrength(s)).toBeGreaterThan(0);
  });
  it("builds through the ten seconds and ends at neutral zero", async () => {
    const { pulseStrength } = await import("./cinema");
    let previous = 0;
    for (let s = 10; s >= 1; s--) {
      const amplitude = pulseStrength(s);
      expect(amplitude).toBeGreaterThanOrEqual(previous);
      expect(amplitude).toBeLessThanOrEqual(1);
      previous = amplitude;
    }
    expect(pulseStrength(0)).toBe(0);
  });
});
