import { clamp, filmEase, randomAt } from "./photoMath";
export { clamp, filmEase, randomAt } from "./photoMath";
import { inkSpreadField } from "./inkSpread";
export const photoTransitions = [
  { id: "velvet", label: "Velvet blend" },
  { id: "glide", label: "Gallery glide" },
  { id: "veil", label: "Silk veil" },
  { id: "lumen", label: "Lightfall" },
  { id: "wash", label: "Watercolour" },
  { id: "ink", label: "Ink spread" },
  { id: "varied", label: "Varied cinematic" },
] as const;
export type PhotoTransition = (typeof photoTransitions)[number]["id"];
export type TransitionStyle = Exclude<PhotoTransition, "varied">;
export type FieldStyle = "veil" | "lumen" | "wash" | "ink";
export function smooth(v: number) {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
}
export function chooseTransition(
  choice: PhotoTransition,
  seed: number,
  previous?: TransitionStyle,
): TransitionStyle {
  if (choice !== "varied") return choice;
  const choices = (
    ["velvet", "glide", "veil", "lumen", "wash", "ink"] as const
  ).filter((v) => v !== previous);
  return choices[Math.floor(randomAt(seed, 71) * choices.length)];
}
export function featherFor(style: TransitionStyle) {
  return style === "ink"
    ? 0.07
    : style === "veil"
      ? 0.24
      : style === "lumen"
        ? 0.34
        : 0.14;
}
export function hasField(style: TransitionStyle): style is FieldStyle {
  return (
    style === "veil" || style === "lumen" || style === "wash" || style === "ink"
  );
}
export function entryPose(style: TransitionStyle, seed: number) {
  const sign = randomAt(seed, 5) < 0.5 ? -1 : 1;
  const x =
    style === "glide"
      ? sign * 2.5
      : style === "veil"
        ? sign * 1.1
        : style === "velvet"
          ? sign * 0.35
          : 0;
  const y =
    style === "lumen"
      ? 0.8
      : style === "wash"
        ? 0.5
        : style === "glide"
          ? (randomAt(seed, 6) - 0.5) * 1.2
          : 0;
  // Keep the camera's scale constant so the slow native-image zoom never
  // reverses direction when an entrance settles.
  const scale = style === "glide" ? 1.035 : 1;
  return {
    from: `translate(${x}%, ${y}%) scale(${scale})`,
    to: `translate(0%, 0%) scale(${scale})`,
    exit: `translate(${-sign * (style === "glide" ? 0.7 : 0.2)}%, -.15%) scale(1.012)`,
  };
}
function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = filmEase(x - ix),
    v = filmEase(y - iy);
  const at = (a: number, b: number) =>
    randomAt(seed ^ Math.imul(a, 374761393) ^ Math.imul(b, 668265263), 17);
  const a = at(ix, iy),
    b = at(ix + 1, iy),
    c = at(ix, iy + 1),
    d = at(ix + 1, iy + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
function turbulence(u: number, v: number, seed: number) {
  return (
    (noise(u * 3, v * 3, seed) - 0.5) * 0.7 +
    (noise(u * 8, v * 8, seed + 9) - 0.5) * 0.23 +
    (noise(u * 21, v * 21, seed + 31) - 0.5) * 0.07
  );
}
// Prepared once per appearance. Only a small scalar matte is encoded; photo
// pixels stay in the native image and are never downsampled or blurred.
export function revealField(
  style: FieldStyle,
  width: number,
  height: number,
  seed = 0,
) {
  const ink = style === "ink" ? inkSpreadField(width, height, seed) : null;
  const result = new Float32Array(width * height),
    aspect = width / Math.max(1, height);
  const wx = aspect >= 1 ? aspect : 1,
    wy = aspect >= 1 ? 1 : 1 / aspect;
  const direction = randomAt(seed, 1) < 0.5 ? -1 : 1,
    angle = (randomAt(seed, 2) - 0.5) * 0.8;
  const ca = Math.cos(angle),
    sa = Math.sin(angle),
    phase = randomAt(seed, 3) * Math.PI * 2;
  const origin = {
    x: 0.12 + randomAt(seed, 4) * 0.35,
    y: -0.25 - randomAt(seed, 5) * 0.2,
  };
  const path = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20,
      along = -0.12 + t * 1.24,
      across =
        0.5 +
        Math.sin(t * Math.PI * 1.45 + phase) * 0.12 +
        Math.sin(t * Math.PI * 3.1 - phase) * 0.035;
    return aspect >= 1
      ? { x: (direction < 0 ? 1 - along : along) * wx, y: across * wy, t }
      : { x: across * wx, y: (direction < 0 ? 1 - along : along) * wy, t };
  });
  let min = Infinity,
    max = -Infinity;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / Math.max(1, width - 1),
        v = y / Math.max(1, height - 1),
        flow = ink ? 0 : turbulence(u, v, seed);
      let value: number;
      if (ink) {
        value = ink[y * width + x];
      } else if (style === "veil") {
        const sx = direction < 0 ? 1 - u : u;
        value =
          sx * ca +
          v * sa * 0.65 +
          Math.sin(v * 2.8 + phase) * 0.07 +
          flow * 0.12;
      } else if (style === "lumen") {
        const dx = (u - origin.x) * wx,
          dy = (v - origin.y) * wy;
        value =
          Math.hypot(dx * 0.52, dy) +
          Math.sin(u * 2.1 + phase) * 0.045 +
          flow * 0.035;
      } else {
        const px = u * wx + flow * 0.025,
          py = v * wy + turbulence(v, u, seed + 7) * 0.025;
        value = Infinity;
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i],
            b = path[i + 1],
            dx = b.x - a.x,
            dy = b.y - a.y;
          const t = clamp(
            ((px - a.x) * dx + (py - a.y) * dy) /
              Math.max(0.000001, dx * dx + dy * dy),
          );
          const distance = Math.hypot(px - a.x - t * dx, py - a.y - t * dy);
          value = Math.min(
            value,
            (a.t + t * (b.t - a.t)) * 0.34 + distance * 0.88,
          );
        }
        value += flow * 0.035;
      }
      result[y * width + x] = value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  // Reserve enough space for the complete feather at both ends. The last
  // corner is fully visible before the mask is removed, with no final pop.
  const feather = featherFor(style),
    margin = feather * 0.5 + 0.03;
  for (let i = 0; i < result.length; i++) {
    const value = clamp((result[i] - min) / Math.max(0.00001, max - min));
    result[i] =
      margin + (1 - 2 * margin) * Math.pow(value, style === "lumen" ? 1.25 : 1);
  }
  return result;
}
export function washFrame(width: number, height: number, seed = 0) {
  const alpha = new Float32Array(width * height),
    short = Math.max(1, Math.min(width, height)),
    w = width / short,
    h = height / short;
  const radius = 0.075 + randomAt(seed, 29) * 0.06,
    halfX = w * 0.5 - 0.05,
    halfY = h * 0.5 - 0.05;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / Math.max(1, width - 1),
        v = y / Math.max(1, height - 1);
      const qx = Math.abs((u - 0.5) * w) - (halfX - radius),
        qy = Math.abs((v - 0.5) * h) - (halfY - radius);
      const distance =
        Math.hypot(Math.max(0, qx), Math.max(0, qy)) +
        Math.min(Math.max(qx, qy), 0) -
        radius;
      const paper =
        turbulence(u * 2, v * 2, seed) * 0.045 +
        (noise(u * 61, v * 61, seed + 21) - 0.5) * 0.005;
      alpha[y * width + x] = 1 - filmEase((distance + paper + 0.018) / 0.036);
    }
  return alpha;
}
export function revealAlpha(
  arrival: number,
  progress: number,
  feather: number,
) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return clamp((progress - arrival) / feather + 0.5);
}
export function photoZoom(
  elapsed: number,
  zoom: number,
  duration: number,
  reduced = false,
) {
  return (
    1.025 +
    (reduced ? 0 : zoom * 0.055 * clamp(elapsed / Math.max(0.1, duration)))
  );
}
export function revealSeed(base: number, visit: number, session: number) {
  return (
    (Math.imul(base | 0, 31) + Math.imul(visit | 0, 104729) + (session | 0)) >>>
    0
  );
}
