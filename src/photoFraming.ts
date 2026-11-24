export type PhotoFocus = {
  focalX?: number;
  focalY?: number;
  portraitX?: number;
  portraitY?: number;
};
export type PhotoAnalysis = { brightness: number; highlights: number };
const unit = (v: unknown, fallback = 0.5) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(1, Math.max(0, v))
    : fallback;
export function focalPoint(f: PhotoFocus | undefined, portrait: boolean) {
  const x = unit(f?.focalX),
    y = unit(f?.focalY);
  return {
    x: portrait ? unit(f?.portraitX, x) : x,
    y: portrait ? unit(f?.portraitY, y) : y,
  };
}
// Matches native object-fit:cover + object-position + a centered CSS scale.
export function photoRect(
  iw: number,
  ih: number,
  w: number,
  h: number,
  zoom: number,
  f: PhotoFocus | undefined,
) {
  const point = focalPoint(f, w < h),
    fit = Math.max(w / iw, h / ih),
    bw = iw * fit,
    bh = ih * fit;
  return {
    x: (w - bw) * point.x * zoom + (w * (1 - zoom)) / 2,
    y: (h - bh) * point.y * zoom + (h * (1 - zoom)) / 2,
    width: bw * zoom,
    height: bh * zoom,
  };
}
export function photoLuminance(data: ArrayLike<number>): PhotoAnalysis {
  let sum = 0,
    high = 0,
    weight = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    const a = data[i + 3] / 255,
      l =
        (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
    sum += l * a;
    high += (l > 0.85 ? 1 : 0) * a;
    weight += a;
  }
  return {
    brightness: weight ? sum / weight : 0.4,
    highlights: weight ? high / weight : 0,
  };
}
export function adaptiveLighting(
  analysis: PhotoAnalysis | undefined,
  enabled: boolean,
) {
  if (!enabled || !analysis) return { flare: 1, shade: 0 };
  const bright = unit(analysis.brightness, 0.4),
    high = unit(analysis.highlights, 0);
  return {
    flare: Math.max(0.3, Math.min(1.3, 1.25 - bright * 0.85 - high * 0.3)),
    shade: Math.max(0, (bright - 0.4) * 0.42 + high * 0.13),
  };
}
export type LivePhotoInfo = {
  id: string | null;
  name: string;
  nextName: string;
  index: number;
  count: number;
  analysis?: PhotoAnalysis;
};
