import { describe, it, expect } from "vitest";
import { inkArrival, inkSpreadField, inkFamilies } from "./inkSpread";
import { revealField, featherFor, revealAlpha } from "./photoTransitions";
function components(field: Float32Array, w: number, threshold: number) {
  const seen = new Uint8Array(field.length),
    queue = new Uint32Array(field.length);
  let count = 0;
  for (let i = 0; i < field.length; i++) {
    if (seen[i] || field[i] > threshold) continue;
    count++;
    let head = 0,
      tail = 1;
    queue[0] = i;
    seen[i] = 1;
    while (head < tail) {
      const p = queue[head++],
        x = p % w;
      for (const n of [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        p - w,
        p + w,
      ]) {
        if (n >= 0 && n < field.length && !seen[n] && field[n] <= threshold) {
          seen[n] = 1;
          queue[tail++] = n;
        }
      }
    }
  }
  return count;
}
describe("continuous ink spread", () => {
  it("spreads isotropically on uniform paper rather than growing a diamond or octagon", () => {
    const n = 81,
      speed = new Float32Array(n * n).fill(1),
      t = inkArrival(speed, n, n, 40 * n + 40);
    expect(t[40 * n + 80]).toBeCloseTo(0.5, 5);
    expect(Math.abs(t[80 * n + 80] - Math.SQRT1_2)).toBeLessThan(0.025);
    expect(Math.abs(t[60 * n + 80] - Math.hypot(0.5, 0.25))).toBeLessThan(
      0.025,
    );
    expect(t[40 * n + 80]).toBeCloseTo(t[80 * n + 40], 8);
  });
  it.each([
    [112, 63],
    [63, 112],
    [128, 48],
  ])("keeps every growing ink front connected at %i × %i", (w, h) => {
    for (const seed of [1, 27, 309]) {
      const field = revealField("ink", w, h, seed);
      for (const progress of [0.13, 0.25, 0.4, 0.6, 0.8, 0.95])
        expect(components(field, w, progress)).toBe(1);
      expect(components(field, w, 1)).toBe(1);
    }
  });
  it("keeps all eight full-detail flow families finite and connected in both orientations", () => {
    for (let family = 0; family < inkFamilies.length; family++)
      for (const [w, h] of [
        [112, 63],
        [63, 112],
      ]) {
        const field = revealField("ink", w, h, (12345 << 3) | family);
        expect(Array.from(field).every(Number.isFinite)).toBe(true);
        for (const progress of [0.2, 0.45, 0.7, 0.95])
          expect(components(field, w, progress)).toBe(1);
      }
  });
  it("varies its origin and flow between appearances while staying deterministic", () => {
    const a = inkSpreadField(120, 68, 3),
      b = inkSpreadField(120, 68, 4);
    expect(a).toEqual(inkSpreadField(120, 68, 3));
    expect(a).not.toEqual(b);
    expect(a.indexOf(0)).not.toBe(b.indexOf(0));
    const x = revealField("ink", 120, 68, 3),
      y = revealField("ink", 120, 68, 4);
    const difference =
      Array.from(x, (v, i) =>
        Math.abs(
          revealAlpha(v, 0.5, featherFor("ink")) -
            revealAlpha(y[i], 0.5, featherFor("ink")),
        ),
      ).reduce((a, b) => a + b, 0) / x.length;
    expect(difference).toBeGreaterThan(0.08);
  });
  it("finishes across the whole screen before settling, with a broad wet edge", () => {
    const field = revealField("ink", 160, 90, 72),
      feather = featherFor("ink");
    expect(
      Array.from(field).every(
        (v) =>
          revealAlpha(v, 0, feather) === 0 &&
          revealAlpha(v, 0.975, feather) === 1,
      ),
    ).toBe(true);
    const edge = Array.from(field, (v) => revealAlpha(v, 0.5, feather)).filter(
      (a) => a > 0 && a < 1,
    );
    expect(edge.length).toBeGreaterThan(field.length * 0.08);
  });
});
