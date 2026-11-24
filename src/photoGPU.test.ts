import { describe, it, expect } from "vitest";
import { coverUV, photoBufferSize } from "./photoGPU";
describe("native GPU photo framing", () => {
  it("preserves a complete 4K photo buffer independently of decorative quality", () => {
    expect(photoBufferSize(3840, 2160, 1)).toEqual({
      width: 3840,
      height: 2160,
    });
    expect(photoBufferSize(390, 844, 3)).toEqual({ width: 780, height: 1688 });
  });
  it("bounds large buffers and respects the hardware texture limit", () => {
    for (const [w, h, d] of [
      [3840, 2160, 2],
      [7680, 4320, 3],
      [390, 844, 4],
    ]) {
      const r = photoBufferSize(w, h, d);
      expect(r.width * r.height).toBeLessThan(8400000);
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
    }
    expect(photoBufferSize(3840, 2160, 2, 2048).width).toBe(2048);
  });
  it("uses the same cover crop as a native image for landscape and portrait", () => {
    expect(coverUV(1920, 1080, 3840, 2160, 0.5, 0.5)).toEqual({
      scale: [1, 1],
      offset: [0, 0],
    });
    const p = coverUV(390, 844, 3840, 2160, 0.8, 0.3);
    expect(p.scale[0]).toBeCloseTo(390 / 844 / (3840 / 2160));
    expect(p.scale[1]).toBe(1);
    expect(p.offset[0]).toBeCloseTo((1 - p.scale[0]) * 0.8);
    expect(p.offset[1]).toBe(0);
  });
  it("keeps every corner inside the source at all focal positions", () => {
    for (const [w, h, iw, ih] of [
      [1920, 1080, 1000, 1600],
      [390, 844, 3840, 2160],
    ])
      for (const x of [0, 0.5, 1])
        for (const y of [0, 0.5, 1]) {
          const c = coverUV(w, h, iw, ih, x, y);
          for (let i = 0; i < 2; i++) {
            expect(c.offset[i]).toBeGreaterThanOrEqual(0);
            expect(c.offset[i] + c.scale[i]).toBeLessThanOrEqual(1.000001);
          }
        }
  });
});
