import { rgb } from "./colors";
import { smooth01 } from "./cinema";
export function backgroundSize(
  width: number,
  height: number,
  quality: string,
  budget = 1,
) {
  const cap =
      (quality === "low" ? 600000 : quality === "high" ? 2100000 : 1300000) *
      budget,
    scale = Math.min(1, Math.sqrt(cap / Math.max(1, width * height)));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export function coverFrame(
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  time: number,
  reduced: boolean,
) {
  const zoom = reduced ? 1.035 : 1.052 + Math.sin(time * 0.025) * 0.008;
  const scale = Math.max(width / imageWidth, height / imageHeight) * zoom;
  const w = imageWidth * scale,
    h = imageHeight * scale;
  const focal = width < height * 0.8 ? 0.22 : 0.5;
  const anchor = Math.max(
    width - w + width * 0.01,
    Math.min(-width * 0.01, width / 2 - w * focal),
  );
  return {
    x: anchor + (reduced ? 0 : Math.sin(time * 0.055) * width * 0.008),
    y:
      (height - h) / 2 +
      (reduced ? 0 : Math.cos(time * 0.041) * height * 0.006),
    width: w,
    height: h,
  };
}
export function toneCurve(
  background: string,
  atmosphere: string,
  light: string,
) {
  const dark = rgb(background),
    mid = rgb(atmosphere),
    bright = rgb(light),
    out = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const n = v / 255,
      low = n <= 0.28,
      t = low ? smooth01(n / 0.28) : Math.pow((n - 0.28) / 0.72, 1.15),
      a = low ? dark : mid,
      b = low ? mid : bright;
    for (let channel = 0; channel < 3; channel++)
      out[v * 3 + channel] = Math.round(
        a[channel] + (b[channel] - a[channel]) * t,
      );
  }
  return out;
}

export function lightMotion(time: number, reduced: boolean) {
  if (reduced) return { x: 0.015, y: 0.01, strength: 0.85 };
  return {
    x: 0.015 + Math.sin(time * 0.055) * 0.025,
    y: 0.01 + Math.cos(time * 0.043) * 0.016,
    strength:
      0.83 + Math.sin(time * 0.19) * 0.095 + Math.sin(time * 0.073) * 0.035,
  };
}
export function hazeMotion(time: number, index: number, reduced: boolean) {
  const t = reduced ? 0 : time,
    side = index % 2;
  return {
    x:
      (side ? 0.76 : 0.08) +
      Math.sin(t * (0.055 + index * 0.009) + index * 1.7) * 0.065,
    y: (side ? 0.78 : 0.19) + Math.cos(t * 0.042 + index * 1.1) * 0.07,
    scale: 0.6 + index * 0.1,
    opacity: 0.16 + Math.sin(t * 0.075 + index) * 0.045,
  };
}

export function rayMotion(time: number, index: number, reduced: boolean) {
  const t = reduced ? 0 : time;
  return {
    angle:
      -0.52 +
      index * 0.17 +
      Math.sin(t * (0.075 + index * 0.013) + index * 1.4) * 0.055 +
      Math.sin(t * 0.027 + index) * 0.02,
    width: 0.11 + index * 0.055,
    opacity: 0.2 + Math.sin(t * 0.14 + index * 1.3) * 0.055,
  };
}
