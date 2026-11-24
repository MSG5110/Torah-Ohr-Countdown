export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function filmEase(v: number) {
  const t = clamp(v);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
export function randomAt(seed: number, lane = 0) {
  let v = (seed ^ Math.imul(lane + 1, 0x9e3779b9)) >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x21f0aaad);
  v = Math.imul(v ^ (v >>> 15), 0x735a2d97);
  return ((v ^ (v >>> 15)) >>> 0) / 4294967296;
}
