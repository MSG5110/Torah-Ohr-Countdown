import { revealField, washFrame, type FieldStyle } from "./photoTransitions";
export type MatteKind = FieldStyle | "wash-frame";
export type MatteRequest = {
  id: number;
  kind: MatteKind;
  seed: number;
  width: number;
  height: number;
};
export function matteDimensions(
  width: number,
  height: number,
  quality: string,
  frame = false,
) {
  const long = frame
    ? quality === "high"
      ? 1024
      : quality === "low"
        ? 384
        : 768
    : quality === "high"
      ? 768
      : quality === "low"
        ? 320
        : 512;
  const ratio = Math.max(0.15, Math.min(6.67, width / Math.max(1, height)));
  return ratio >= 1
    ? { width: long, height: Math.max(96, Math.round(long / ratio)) }
    : { width: Math.max(96, Math.round(long * ratio)), height: long };
}
export function arrivalPixels(arrival: Float32Array) {
  const pixels = new Uint8ClampedArray(arrival.length * 4);
  for (let i = 0; i < arrival.length; i++) {
    const value = Math.round(Math.max(0, Math.min(1, 1 - arrival[i])) * 65535);
    pixels[i * 4] = value >>> 8;
    pixels[i * 4 + 1] = value & 255;
    pixels[i * 4 + 3] = 255;
  }
  return pixels;
}
export function makeMattePixels(request: Omit<MatteRequest, "id">) {
  if (request.kind !== "wash-frame")
    return arrivalPixels(
      revealField(request.kind, request.width, request.height, request.seed),
    );
  const alpha = washFrame(request.width, request.height, request.seed),
    pixels = new Uint8ClampedArray(alpha.length * 4);
  for (let i = 0; i < alpha.length; i++) {
    pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = 255;
    pixels[i * 4 + 3] = Math.round(alpha[i] * 255);
  }
  return pixels;
}
export function matteIntercept(progress: number, feather = 0.24) {
  const gain = 1 / feather;
  return progress <= 0
    ? -gain - 1
    : progress >= 1
      ? 1
      : (progress - 1) * gain + 0.5;
}
export function matteMatrix(progress: number, feather = 0.24) {
  const gain = 1 / feather;
  return `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${(gain * 256) / 257} ${gain / 257} 0 0 ${matteIntercept(progress, feather)}`;
}
