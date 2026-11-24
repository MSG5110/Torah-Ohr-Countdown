import { describe, expect, it } from "vitest";
import {
  photoZoom,
  revealSeed,
  revealField,
  revealAlpha,
  featherFor,
} from "./photoTransitions";
import { glintEnvelope } from "./optics";
describe("continuous photo motion", () => {
  it("keeps native photo motion continuous during and after its reveal", () => {
    expect(photoZoom(1, 1, 23)).toBeGreaterThan(photoZoom(0, 1, 23));
    expect(photoZoom(3, 1, 23)).toBeGreaterThan(photoZoom(1, 1, 23));
    expect(
      Math.abs(photoZoom(3.001, 1, 23) - photoZoom(3, 1, 23)),
    ).toBeLessThan(0.00001);
    expect(photoZoom(30, 1, 23)).toBeCloseTo(1.08);
    expect(photoZoom(8, 1, 23, true)).toBe(1.025);
    expect(photoZoom(8, 0, 23)).toBe(1.025);
  });
  it("varies repeated appearances of the same picture and separate sessions", () => {
    expect(revealSeed(100, 1, 700)).not.toBe(revealSeed(100, 2, 700));
    expect(revealSeed(100, 1, 700)).not.toBe(revealSeed(100, 1, 800));
    const a = revealField("wash", 64, 36, revealSeed(100, 1, 700)),
      b = revealField("wash", 64, 36, revealSeed(100, 2, 700));
    const difference =
      Array.from(a).reduce(
        (sum, v, i) =>
          sum +
          Math.abs(
            revealAlpha(v, 0.4, featherFor("wash")) -
              revealAlpha(b[i], 0.4, featherFor("wash")),
          ),
        0,
      ) / a.length;
    expect(difference).toBeGreaterThan(0.04);
  });
  it("keeps established sparkle phase stable as intensity grows, even after days", () => {
    for (const time of [10, 864000]) {
      const a = glintEnvelope(time, 1.7, 0.7),
        b = glintEnvelope(time + 1 / 60, 1.7, 0.7001);
      expect(Math.abs(a - b)).toBeLessThan(0.03);
    }
  });
});
