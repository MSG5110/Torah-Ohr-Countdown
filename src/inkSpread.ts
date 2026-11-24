import { filmEase, randomAt } from "./photoMath";

// Solve travel time through a smooth paper-permeability field. Fast marching
// grows one connected front, including around slow patches, without a circular
// iris or separately appearing blobs. Preparation runs once in the matte worker.
export function inkArrival(
  speed: Float32Array,
  width: number,
  height: number,
  source: number,
) {
  const count = width * height,
    time = new Float64Array(count),
    accepted = new Uint8Array(count);
  const heap = new Uint32Array(count),
    position = new Int32Array(count);
  time.fill(Infinity);
  position.fill(-1);
  let size = 0;
  const swap = (a: number, b: number) => {
    const index = heap[a];
    heap[a] = heap[b];
    heap[b] = index;
    position[heap[a]] = a;
    position[heap[b]] = b;
  };
  const enqueue = (index: number, value: number) => {
    if (value >= time[index]) return;
    time[index] = value;
    let at = position[index];
    if (at < 0) {
      at = size++;
      heap[at] = index;
      position[index] = at;
    }
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (time[heap[parent]] <= value) break;
      swap(at, parent);
      at = parent;
    }
  };
  const step = 1 / Math.max(1, Math.min(width, height) - 1);
  const update = (i: number) => {
    if (accepted[i]) return;
    const x = i % width;
    const a = Math.min(
      x > 0 && accepted[i - 1] ? time[i - 1] : Infinity,
      x < width - 1 && accepted[i + 1] ? time[i + 1] : Infinity,
    );
    const b = Math.min(
      i >= width && accepted[i - width] ? time[i - width] : Infinity,
      i + width < count && accepted[i + width] ? time[i + width] : Infinity,
    );
    const lower = Math.min(a, b),
      cost = step / Math.max(0.05, speed[i]);
    if (!Number.isFinite(lower)) return;
    const difference = Math.abs(a - b);
    enqueue(
      i,
      difference >= cost
        ? lower + cost
        : (a +
            b +
            Math.sqrt(Math.max(0, 2 * cost * cost - difference * difference))) /
            2,
    );
  };
  enqueue(Math.max(0, Math.min(count - 1, source)), 0);
  while (size) {
    const index = heap[0];
    position[index] = -1;
    size--;
    if (size) {
      heap[0] = heap[size];
      position[heap[0]] = 0;
      let at = 0;
      while (at * 2 + 1 < size) {
        let child = at * 2 + 1;
        if (child + 1 < size && time[heap[child + 1]] < time[heap[child]])
          child++;
        if (time[heap[at]] <= time[heap[child]]) break;
        swap(at, child);
        at = child;
      }
    }
    accepted[index] = 1;
    const x = index % width;
    if (x > 0) update(index - 1);
    if (x < width - 1) update(index + 1);
    if (index >= width) update(index - width);
    if (index + width < count) update(index + width);
  }
  return time;
}
// Cache the exact double-precision noise lattice once per field. Pixel sampling
// uses the same interpolation as before, without repeatedly hashing each cell.
export function inkNoise(
  seed: number,
  xBound: number,
  yBound: number,
  positive = false,
) {
  const x0 = positive ? 0 : Math.floor(-xBound) - 1,
    y0 = positive ? 0 : Math.floor(-yBound) - 1;
  const width = Math.ceil(xBound) - x0 + 3,
    height = Math.ceil(yBound) - y0 + 3;
  const values = new Float64Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      values[y * width + x] = randomAt(
        seed ^ Math.imul(x + x0, 374761393) ^ Math.imul(y + y0, 668265263),
        91,
      );
  return (x: number, y: number) => {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      u = filmEase(x - ix),
      v = filmEase(y - iy);
    const index = (iy - y0) * width + ix - x0;
    const a = values[index],
      b = values[index + 1],
      c = values[index + width],
      d = values[index + width + 1];
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
}
export const inkFamilies = [
  {
    name: "left plume",
    x: 0.12,
    y: 0.5,
    angle: 0,
    stretch: 2.2,
    grain: 2.1,
    warp: 0.46,
    contrast: 1,
  },
  {
    name: "right plume",
    x: 0.88,
    y: 0.5,
    angle: Math.PI,
    stretch: 1.8,
    grain: 2.7,
    warp: 0.62,
    contrast: 1.2,
  },
  {
    name: "upper cascade",
    x: 0.5,
    y: 0.1,
    angle: Math.PI / 2,
    stretch: 2.4,
    grain: 2.4,
    warp: 0.38,
    contrast: 0.9,
  },
  {
    name: "lower cascade",
    x: 0.5,
    y: 0.9,
    angle: -Math.PI / 2,
    stretch: 1.65,
    grain: 1.6,
    warp: 0.65,
    contrast: 1.1,
  },
  {
    name: "branching diagonal",
    x: 0.14,
    y: 0.14,
    angle: Math.PI / 4,
    stretch: 1.9,
    grain: 3.8,
    warp: 0.7,
    contrast: 1.35,
  },
  {
    name: "broad diagonal",
    x: 0.86,
    y: 0.86,
    angle: -Math.PI * 0.75,
    stretch: 1.45,
    grain: 1.5,
    warp: 0.36,
    contrast: 0.75,
  },
  {
    name: "central bloom",
    x: 0.5,
    y: 0.5,
    angle: 0,
    stretch: 1,
    grain: 2.9,
    warp: 0.55,
    contrast: 1.1,
  },
  {
    name: "rising feather",
    x: 0.14,
    y: 0.86,
    angle: -Math.PI / 4,
    stretch: 2.6,
    grain: 3.2,
    warp: 0.6,
    contrast: 1.25,
  },
] as const;
export function inkProfile(seed: number) {
  const family = seed & 7,
    base = inkFamilies[family];
  return {
    ...base,
    family,
    x: base.x + (randomAt(seed, 111) - 0.5) * 0.075,
    y: base.y + (randomAt(seed, 119) - 0.5) * 0.075,
    angle:
      base.angle +
      (randomAt(seed, 131) - 0.5) * (family === 6 ? Math.PI * 2 : 0.55),
    stretch: base.stretch * (0.85 + randomAt(seed, 149) * 0.3),
  };
}
// Encode a deliberately different family in the seed. Tiny noise changes alone
// looked too similar: consecutive origins must also move across the composition.
export function chooseInkSeed(seed: number, previous?: number) {
  const before = previous === undefined ? null : inkFamilies[previous & 7];
  const choices = inkFamilies
    .map((_, i) => i)
    .filter(
      (i) =>
        !before ||
        (i !== (previous! & 7) &&
          Math.hypot(inkFamilies[i].x - before.x, inkFamilies[i].y - before.y) >
            0.38),
    );
  const family = choices[Math.floor(randomAt(seed, 151) * choices.length)];
  return (((seed >>> 3) << 3) | family) >>> 0;
}
export function inkSpreadField(width: number, height: number, seed: number) {
  const speed = new Float32Array(width * height),
    step = 1 / Math.max(1, Math.min(width, height) - 1),
    profile = inkProfile(seed),
    ca = Math.cos(profile.angle),
    sa = Math.sin(profile.angle);
  const wx = (width - 1) * step,
    hy = (height - 1) * step;
  const uBound =
    (Math.abs(ca) * wx + Math.abs(sa) * hy) / profile.stretch +
    profile.warp * 0.5;
  const vBound =
    (Math.abs(sa) * wx + Math.abs(ca) * hy) * Math.sqrt(profile.stretch) +
    profile.warp * 0.5;
  const warpX = inkNoise(seed + 101, wx * 1.6, hy * 1.6, true),
    warpY = inkNoise(seed + 137, wx * 1.6, hy * 1.6, true);
  const coarse = inkNoise(seed, uBound * profile.grain, vBound * profile.grain),
    medium = inkNoise(
      seed + 31,
      uBound * profile.grain * 2.4,
      vBound * profile.grain * 2.4,
    ),
    fine = inkNoise(seed + 67, uBound * 13, vBound * 13);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const px = x * step,
        py = y * step;
      const bendX = (warpX(px * 1.6, py * 1.6) - 0.5) * profile.warp;
      const bendY = (warpY(px * 1.6, py * 1.6) - 0.5) * profile.warp;
      const u = (ca * px + sa * py) / profile.stretch + bendX,
        v = (-sa * px + ca * py) * Math.sqrt(profile.stretch) + bendY;
      const paper =
        coarse(u * profile.grain, v * profile.grain) * 0.64 +
        medium(u * profile.grain * 2.4, v * profile.grain * 2.4) * 0.27 +
        fine(u * 13, v * 13) * 0.09;
      const flow = Math.max(
        0,
        Math.min(1, 0.5 + (paper - 0.5) * profile.contrast),
      );
      speed[y * width + x] = 0.36 + filmEase(flow) * 2.55;
    }
  const x = Math.round(profile.x * (width - 1)),
    y = Math.round(profile.y * (height - 1));
  return inkArrival(speed, width, height, y * width + x);
}
