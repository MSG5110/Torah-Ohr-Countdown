import { mix, rgba } from "./colors";
import { clamp01, smooth01 } from "./cinema";
// Unsynchronised, soft optical catches. No on/off flashes or random frame noise.
export function glintEnvelope(time: number, phase: number, activity: number) {
  const period = 8.5 + Math.sin(phase * 2.1) * 2;
  const p = (((time / period + phase) % 1) + 1) % 1;
  const x = (p - 0.5) / (0.13 + clamp01(activity) * 0.025);
  return Math.exp(-x * x * 2.5) * smooth01(p / 0.12) * smooth01((1 - p) / 0.18);
}
export function launchOptics(elapsed: number) {
  const bell = (start: number, peak: number, end: number) =>
    elapsed < start || elapsed > end
      ? 0
      : elapsed <= peak
        ? smooth01((elapsed - start) / (peak - start))
        : 1 - smooth01((elapsed - peak) / (end - peak));
  return {
    gather: bell(0, 0.7, 1.65),
    release: bell(0.55, 1.45, 3.4),
    handoff: bell(1.65, 3.05, 5.8),
    sheen: clamp01((elapsed - 3.15) / 1.75),
  };
}
// Keep the full soft falloff inside the display, including phone landscape.
// Compute on resize; drawing only scales these cached footprints each frame.
export function finalTenLights(width: number, height: number) {
  const margin = Math.min(width, height) * 0.04;
  return [
    { x: width * 0.22, y: height * 0.24 },
    { x: width * 0.78, y: height * 0.73 },
  ].map(({ x, y }) => ({
    x,
    y,
    width: Math.max(
      0,
      Math.min(width * 0.65, 2 * (Math.min(x, width - x) - margin)),
    ),
    height: Math.max(
      0,
      Math.min(
        Math.min(width, height) * 0.85,
        2 * (Math.min(y, height - y) - margin),
      ),
    ),
  }));
}
function texture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, g: canvas.getContext("2d") };
}
export function bloomTexture(color: string) {
  const { canvas, g } = texture(256, 256);
  if (!g) return canvas;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, rgba(mix(color, "#ffffff", 0.25), 0.6));
  grad.addColorStop(0.12, rgba(color, 0.28));
  grad.addColorStop(0.42, rgba(color, 0.065));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return canvas;
}
export function flareTexture(color: string) {
  const { canvas, g } = texture(1024, 96);
  if (!g) return canvas;
  // Two feathered anamorphic lobes, never a solid line across the picture.
  const band = (height: number, alpha: number) => {
    g.save();
    g.translate(512, 48);
    g.scale(1, height / 96);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 512);
    grad.addColorStop(0, rgba(mix(color, "#ffffff", 0.65), alpha));
    grad.addColorStop(0.06, rgba(color, alpha * 0.55));
    grad.addColorStop(0.35, rgba(color, alpha * 0.15));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(-512, -512, 1024, 1024);
    g.restore();
  };
  band(2, 0.8);
  band(0.35, 0.9);
  return canvas;
}
export function glintTexture(color: string, variant: number) {
  const { canvas, g } = texture(192, 192);
  if (!g) return canvas;
  g.drawImage(bloomTexture(color), 56, 56, 80, 80);
  // Tapered diffraction rays with a warm-white core, baked once per theme.
  const ray = (angle: number, length: number, width: number, alpha: number) => {
    g.save();
    g.translate(96, 96);
    g.rotate(angle);
    g.scale(1, width);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, length);
    grad.addColorStop(0, rgba(mix(color, "#ffffff", 0.8), alpha));
    grad.addColorStop(0.12, rgba(color, alpha * 0.6));
    grad.addColorStop(0.55, rgba(color, alpha * 0.12));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(-length, -length, length * 2, length * 2);
    g.restore();
  };
  ray(variant ? 0.25 : 0, 88, 0.018, 0.95);
  ray(variant ? 1.85 : Math.PI / 2, variant ? 44 : 58, 0.022, 0.6);
  if (variant) ray(2.6, 30, 0.025, 0.22);
  const core = g.createRadialGradient(96, 96, 0, 96, 96, 3);
  core.addColorStop(0, "#fff8ec");
  core.addColorStop(0.25, rgba(color, 0.9));
  core.addColorStop(1, rgba(color, 0));
  g.fillStyle = core;
  g.fillRect(92, 92, 8, 8);
  return canvas;
}
