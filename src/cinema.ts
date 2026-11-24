export const cinematicEase = [0.22, 1, 0.36, 1] as const;
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const celebrationStart = 0.65;
export function launchTimeline(seconds: number) {
  return {
    release: clamp01((seconds - 0.25) / 1.3),
    logo: clamp01((seconds - 1.8) / 1.6),
    title: clamp01((seconds - 2.65) / 1.45),
    fireworks: seconds >= celebrationStart && seconds < 9.4,
    confetti: seconds >= celebrationStart && seconds < 11.5,
    settle: smooth01((seconds - 10) / 6),
  };
}
export const shells = [
  celebrationStart, 0.82, 1.85, 2.8, 3.05, 4.1, 4.32, 5.3, 6.4, 6.58, 7.5, 8.5, 8.72, 9.2,
];

export const smooth01 = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
// Overlapping, zero-slope envelopes. There is no switch at 60 or 10 seconds.
export function countdownIntensity(seconds: number) {
  const r = Math.max(0, seconds);
  return (
    0.35 * smooth01(1 - r / 86400) +
    0.55 * smooth01(1 - r / 3600) +
    0.9 * smooth01(1 - r / 300) +
    1.9 * smooth01(1 - r / 60) +
    0.8 * smooth01(1 - r / 20)
  );
}

// Opacity only: the existing countdown DOM remains the finale's zero.
export function zeroOpacity(elapsed: number) {
  const t = clamp01((elapsed - 0.65) / 1.75);
  return clamp01(1 - t * t * t * (t * (t * 6 - 15) + 10));
}
// Each beat finishes before the next digit/zero, so zero never inherits a scale.
export function pulseStrength(seconds: number) {
  return seconds >= 1 && seconds <= 10 ? 0.6 + (0.4 * (10 - seconds)) / 9 : 0;
}

// Rehearsal, refresh and sleep jumps do not generate spurious hourly beats.
export function crossedHour(previous: number, current: number) {
  return (
    current > 0 &&
    previous > current &&
    previous - current <= 2 &&
    Math.floor(previous / 3600) > Math.floor(current / 3600)
  );
}
export function photosHidden(
  mode: string,
  enabled: boolean,
  seconds: number | null,
) {
  return (
    !enabled ||
    mode === "cinematic" ||
    (mode !== "photos" && seconds !== null && seconds <= 10)
  );
}
