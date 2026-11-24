import { describe, it, expect, vi } from "vitest";
import { PhotoDecodeCache } from "./photoDecode";
import { TrailBuffer, removeUnordered, insertDepth } from "./effectResources";
import { chooseInkSeed, inkProfile, inkFamilies, inkNoise } from "./inkSpread";
import { randomAt, filmEase } from "./photoMath";
describe("noticeably different ink appearances", () => {
  it("never repeats a family or nearby origin across a long sequence", () => {
    let previous: number | undefined;
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const seed = chooseInkSeed(
          Math.floor(randomAt(i, 73) * 4294967296),
          previous,
        ),
        p = inkProfile(seed);
      seen.add(p.family);
      if (previous !== undefined) {
        const a = inkFamilies[previous & 7],
          b = inkFamilies[p.family];
        expect(p.family).not.toBe(previous & 7);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.38);
      }
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
      previous = seed;
    }
    expect(seen.size).toBe(8);
  });
  it("keeps cached noise exactly equivalent to uncached double-precision interpolation", () => {
    const seed = 19,
      sample = inkNoise(seed, 8, 8);
    const at = (x: number, y: number) =>
      randomAt(seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263), 91);
    for (const [x, y] of [
      [-3.7, 2.3],
      [0, 0],
      [7.999, -7.99],
      [0.123, 0.987],
    ]) {
      const ix = Math.floor(x),
        iy = Math.floor(y),
        u = filmEase(x - ix),
        v = filmEase(y - iy);
      const a = at(ix, iy),
        b = at(ix + 1, iy),
        c = at(ix, iy + 1),
        d = at(ix + 1, iy + 1);
      expect(sample(x, y)).toBe(
        (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v,
      );
    }
  });
});
describe("full-resolution predecode without memory growth", () => {
  it("shares in-flight decoding and reuses exact original images", async () => {
    const original = { naturalWidth: 4096, naturalHeight: 2160 },
      load = vi.fn(async () => original),
      c = new PhotoDecodeCache(load);
    const [a, b] = await Promise.all([c.get("a"), c.get("a")]);
    expect(load).toHaveBeenCalledOnce();
    expect(a).toBe(original);
    expect(b).toBe(original);
  });
  it("evicts older frames while preserving current and next originals", async () => {
    const load = vi.fn(async () => ({
        naturalWidth: 3840,
        naturalHeight: 2160,
      })),
      c = new PhotoDecodeCache(load);
    await c.get("a");
    await c.get("b");
    await c.get("a");
    await c.get("c");
    expect(c.size).toBe(2);
    expect(load).toHaveBeenCalledTimes(3);
    await c.get("b");
    expect(load).toHaveBeenCalledTimes(4);
    expect(c.size).toBe(2);
  });
  it("bounds large image memory by eviction rather than lowering resolution", async () => {
    const c = new PhotoDecodeCache(async () => ({
      naturalWidth: 4096,
      naturalHeight: 4096,
    }));
    await c.get("a");
    const image = await c.get("b");
    expect(c.size).toBe(1);
    expect(image.naturalWidth).toBe(4096);
  });
  it("releases deleted gallery frames without changing retained source pixels", async () => {
    const c = new PhotoDecodeCache(async () => ({
      naturalWidth: 3840,
      naturalHeight: 2160,
    }));
    const a = await c.get("a");
    await c.get("b");
    c.retain(["a"]);
    expect(c.size).toBe(1);
    expect(await c.get("a")).toBe(a);
    c.retain([]);
    expect(c.size).toBe(0);
  });
  it("retries failed decoding and does not repopulate a cleared cache", async () => {
    let resolve!: (v: { naturalWidth: number; naturalHeight: number }) => void;
    const c = new PhotoDecodeCache(
      () =>
        new Promise<{ naturalWidth: number; naturalHeight: number }>(
          (r) => (resolve = r),
        ),
    );
    const pending = c.get("a");
    await Promise.resolve();
    c.clear();
    resolve({ naturalWidth: 3840, naturalHeight: 2160 });
    await pending;
    expect(c.size).toBe(0);
    const load = vi
        .fn()
        .mockRejectedValueOnce(Error("bad"))
        .mockResolvedValue({ naturalWidth: 1, naturalHeight: 1 }),
      d = new PhotoDecodeCache(load);
    await expect(d.get("bad")).rejects.toThrow("bad");
    await d.get("bad");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
describe("allocation-free celebration paths", () => {
  it("reuses a bounded newest-first trail through thousands of frames", () => {
    const t = new TrailBuffer(6),
      storage = t.values;
    for (let i = 0; i < 10000; i++) t.push(i, i * 2);
    expect(t.values).toBe(storage);
    expect(t.length).toBe(6);
    for (let i = 0; i < 6; i++) {
      expect(t.x(i)).toBe(9999 - i);
      expect(t.y(i)).toBe((9999 - i) * 2);
    }
  });
  it("removes expired sparks without skipping or advancing another spark twice", () => {
    const rows = Array.from({ length: 100 }, (_, i) => i),
      seen: number[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      seen.push(rows[i]);
      if (rows[i] % 2) removeUnordered(rows, i);
    }
    expect(new Set(seen).size).toBe(100);
    expect(seen).toHaveLength(100);
    expect(rows.every((n) => n % 2 === 0)).toBe(true);
  });
  it("keeps the exact confetti depth order without sorting every frame", () => {
    const rows: { z: number; id: number }[] = [];
    for (let i = 0; i < 520; i++)
      insertDepth(rows, { z: randomAt(i, 4), id: i });
    expect(rows.map((p) => p.z)).toEqual(
      rows
        .map((p) => p.z)
        .slice()
        .sort((a, b) => a - b),
    );
    expect(rows).toHaveLength(520);
  });
});
