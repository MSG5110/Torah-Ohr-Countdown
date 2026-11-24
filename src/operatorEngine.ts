export function frameSummary(samples: number[]) {
  const valid = samples
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (!valid.length) return { fps: 0, p95: 0, slow: 0 };
  return {
    fps: Math.round(1000 / (valid.reduce((a, v) => a + v, 0) / valid.length)),
    p95:
      Math.round(
        valid[Math.min(valid.length - 1, Math.floor(valid.length * 0.95))] * 10,
      ) / 10,
    slow: valid.filter((v) => v > 34).length,
  };
}
export const rehearsalStages = [
  { label: "Normal countdown", seconds: 864000, duration: 3 },
  { label: "24-hour transition", seconds: 86401, duration: 3 },
  { label: "One-hour transition", seconds: 3601, duration: 3 },
  { label: "One-minute transition", seconds: 61, duration: 3 },
  { label: "Final ten and complete launch", seconds: 11, duration: 28 },
];
export function rehearsalFrame(started: number, now: number) {
  let offset = 0;
  for (let i = 0; i < rehearsalStages.length; i++) {
    const stage = rehearsalStages[i];
    if (now < started + (offset + stage.duration) * 1000)
      return {
        done: false,
        index: i,
        label: stage.label,
        preview: {
          started: started + offset * 1000,
          target: started + (offset + stage.seconds) * 1000,
        },
      };
    offset += stage.duration;
  }
  return {
    done: true,
    index: rehearsalStages.length,
    label: "Rehearsal complete",
    preview: null,
  };
}
export function finalTenCue(seconds: number) {
  const build = Math.max(0, Math.min(1, (10 - seconds) / 10));
  return {
    build: build * build * (3 - 2 * build),
    beat:
      seconds > 0 && seconds <= 10
        ? beatEnvelope(Math.ceil(seconds) - seconds)
        : 0,
  };
}

function beatEnvelope(phase: number) {
  const smooth = (n: number) => {
    const t = Math.max(0, Math.min(1, n));
    return t * t * (3 - 2 * t);
  };
  return smooth(phase / 0.22) * (1 - smooth((phase - 0.3) / 0.55));
}
