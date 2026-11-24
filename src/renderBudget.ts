export function effectsCanvasSize(
  width: number,
  height: number,
  dpr: number,
  quality: string,
  budget = 1,
) {
  const cap =
    (quality === "low" ? 650000 : quality === "high" ? 4200000 : 2100000) *
    Math.max(0.35, Math.min(1, budget));
  const scale = Math.min(
    Math.max(0.25, dpr || 1),
    quality === "low" ? 1 : 1.35,
    Math.sqrt(cap / Math.max(1, width * height)),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}
