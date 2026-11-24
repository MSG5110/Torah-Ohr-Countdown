import { describe, it, expect } from "vitest";
import {
  arrivalPixels,
  matteDimensions,
  matteIntercept,
  matteMatrix,
  makeMattePixels,
} from "./matteModel";
import { PhotoURLPool } from "./photoResources";
import { finalTenLights } from "./optics";
import { effectsCanvasSize } from "./renderBudget";
describe("full-resolution reveal masks", () => {
  it("encodes the reveal field with 16-bit precision independent of the photo", () => {
    const field = new Float32Array([0.035, 0.5, 0.965, 0.50314]),
      p = arrivalPixels(field);
    for (let i = 0; i < field.length; i++) {
      const decoded = (p[i * 4] * 256 + p[i * 4 + 1]) / 65535;
      expect(Math.abs(decoded - (1 - field[i]))).toBeLessThan(1 / 65535);
      expect(p[i * 4 + 3]).toBe(255);
    }
  });
  it("has transparent and opaque endpoints without an image replacement", () => {
    for (const a of [0.035, 0.5, 0.965]) {
      const value = 1 - a;
      expect(value / 0.24 + matteIntercept(0)).toBeLessThan(0);
      expect(value / 0.24 + matteIntercept(1)).toBeGreaterThanOrEqual(1);
    }
    expect(matteIntercept(0.5)).toBeLessThan(matteIntercept(0.6));
  });
  it("budgets only the mask at TV and phone sizes", () => {
    for (const [w, h] of [
      [1920, 1080],
      [3840, 2160],
      [390, 844],
    ]) {
      const auto = matteDimensions(w, h, "auto"),
        high = matteDimensions(w, h, "high");
      expect(Math.max(auto.width, auto.height)).toBe(512);
      expect(high.width * high.height).toBeGreaterThan(
        auto.width * auto.height,
      );
      expect(auto.width * auto.height).toBeLessThan(300000);
    }
  });
  it("keeps the new watercolour frame transparent outside its feathered edge", () => {
    const p = makeMattePixels({
      kind: "wash-frame",
      seed: 0,
      width: 384,
      height: 384,
    });
    expect(p[3]).toBe(0);
    expect(p[(192 * 384 + 192) * 4 + 3]).toBe(255);
  });
  it("produces varied small native masks without storing a resampled photo", () => {
    const a = makeMattePixels({ kind: "veil", seed: 1, width: 32, height: 18 }),
      b = makeMattePixels({ kind: "veil", seed: 2, width: 32, height: 18 });
    expect(a).not.toEqual(b);
    expect(a.length).toBe(32 * 18 * 4);
    expect(
      makeMattePixels({ kind: "wash", seed: 1, width: 384, height: 384 })
        .length,
    ).toBe(384 * 384 * 4);
  });
});
describe("photo URL ownership", () => {
  it("reuses a source through metadata edits and preserves an outgoing layer until it is gone", () => {
    let serial = 0;
    const revoked: string[] = [];
    const pool = new PhotoURLPool({
        createObjectURL: () => `blob:test-${++serial}`,
        revokeObjectURL: (u) => revoked.push(u),
      }),
      blob = new Blob(["photo"]);
    const gallery = pool.acquire(blob),
      releaseSlide = pool.retain(gallery.url),
      edit = pool.acquire(blob);
    expect(edit.url).toBe(gallery.url);
    expect(serial).toBe(1);
    gallery.release();
    edit.release();
    expect(revoked).toHaveLength(0);
    releaseSlide();
    expect(revoked).toEqual([gallery.url]);
    expect(pool.size).toBe(0);
    releaseSlide();
    expect(revoked).toHaveLength(1);
  });
  it("does not accumulate resources after repeated gallery changes", () => {
    let serial = 0,
      revoked = 0;
    const pool = new PhotoURLPool({
      createObjectURL: () => `blob:${serial++}`,
      revokeObjectURL: () => revoked++,
    });
    for (let i = 0; i < 1000; i++) {
      const a = pool.acquire(new Blob([String(i)]));
      const release = pool.retain(a.url);
      a.release();
      release();
    }
    expect(pool.size).toBe(0);
    expect(revoked).toBe(1000);
  });
});
describe("ambient rendering budget", () => {
  it("caps expensive 4K effects without changing CSS layout or native images", () => {
    const auto = effectsCanvasSize(3840, 2160, 2, "auto"),
      high = effectsCanvasSize(3840, 2160, 2, "high");
    expect(auto.width * auto.height).toBeLessThan(2110000);
    expect(high.width * high.height).toBeLessThan(4210000);
    expect(high.scale).toBeGreaterThan(auto.scale);
    expect(effectsCanvasSize(1920, 1080, 1, "auto").scale).toBe(1);
  });
});

describe("final-ten light falloff", () => {
  it.each([
    [1920, 1080],
    [3840, 2160],
    [390, 844],
    [844, 390],
    [320, 568],
  ])(
    "keeps both complete glow textures inside %i × %i at maximum build",
    (w, h) => {
      const margin = Math.min(w, h) * 0.04;
      for (const light of finalTenLights(w, h)) {
        expect(light.width).toBeGreaterThan(0);
        expect(light.height).toBeGreaterThan(0);
        for (const spread of [0.84, 0.92, 1]) {
          expect(light.x - (light.width * spread) / 2).toBeGreaterThanOrEqual(
            margin - 1e-9,
          );
          expect(light.x + (light.width * spread) / 2).toBeLessThanOrEqual(
            w - margin + 1e-9,
          );
          expect(light.y - (light.height * spread) / 2).toBeGreaterThanOrEqual(
            margin - 1e-9,
          );
          expect(light.y + (light.height * spread) / 2).toBeLessThanOrEqual(
            h - margin + 1e-9,
          );
        }
      }
    },
  );
});

describe("feathered native reveal matte", () => {
  it("uses a wide blend band without changing encoded photo pixels", () => {
    const p = 0.5,
      inkFeather = 0.24;
    const matrix = matteMatrix(p, inkFeather).trim().split(/\s+/).map(Number);
    expect(matrix).toHaveLength(20);
    const sample = (arrival: number) =>
      (1 - arrival) / inkFeather + matteIntercept(p, inkFeather);
    expect(sample(p)).toBeCloseTo(0.5);
    expect(sample(p - inkFeather / 2)).toBeCloseTo(1);
    expect(sample(p + inkFeather / 2)).toBeCloseTo(0);
    expect(matrix[15] + matrix[16]).toBeCloseTo(1 / inkFeather);
    expect(matteIntercept(0, inkFeather)).toBeLessThan(-1 / inkFeather);
    expect(matteIntercept(1, inkFeather)).toBe(1);
    expect(matteIntercept(0.5)).toBeCloseTo(-1.5833333333);
  });
});
