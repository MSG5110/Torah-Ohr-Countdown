export function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
export function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}
export function rgba(hex: string, alpha: number) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
export function mix(hex: string, other: string, amount: number) {
  const a = rgb(hex),
    b = rgb(other);
  // Keep the same canonical format as palette inputs: callers may feed the
  // result back into rgb()/rgba(), as the optical gradient builders do.
  return `#${a
    .map((v, i) =>
      Math.round(v + (b[i] - v) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
export const colorDefaults = {
  backgroundColor: "#050b08",
  atmosphereColor: "#103322",
  digitColor: "#d5b46a",
  labelColor: "#cec6a6",
  particleColor: "#d5b46a",
  lightColor: "#f2d99c",
  haloColor: "#d5b46a",
  fireworkColor: "#f2d99c",
  confettiColor: "#d5b46a",
  launchColor: "#d5b46a",
  photoTintColor: "#091a12",
  shockwaveColor: "#f2d99c",
};
