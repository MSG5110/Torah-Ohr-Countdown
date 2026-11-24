export type PrizeRun = {
  prizeId: string;
  name: string;
  startedAt: number;
  endAt: number;
  revealSeconds: number;
  revealText: string;
  pausedAt?: number;
};
export const PRIZE_RUN_KEY = "torah-ore-prize-run-v1";
export function prizeDuration(hours: number, minutes: number, seconds: number) {
  if (
    ![hours, minutes, seconds].every(
      (v) => Number.isSafeInteger(v) && v >= 0,
    ) ||
    minutes > 59 ||
    seconds > 59
  )
    throw new Error("Enter whole hours, and minutes/seconds from 0 to 59.");
  const total = hours * 3600 + minutes * 60 + seconds;
  if (total <= 0 || !Number.isSafeInteger(total))
    throw new Error("Choose a countdown longer than zero seconds.");
  return total;
}
export function newPrizeRun(
  prizeId: string,
  name: string,
  seconds: number,
  revealSeconds: number,
  now = Date.now(),
  revealText = "",
): PrizeRun {
  if (
    typeof prizeId !== "string" ||
    typeof name !== "string" ||
    !prizeId ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isFinite(revealSeconds) ||
    revealSeconds < 0 ||
    now + seconds * 1000 > 8.64e15 ||
    !Number.isSafeInteger(seconds * 1000) ||
    !Number.isSafeInteger(revealSeconds * 1000)
  )
    throw new Error("Choose a valid prize and countdown duration.");
  return {
    prizeId,
    name,
    startedAt: now,
    endAt: now + seconds * 1000,
    revealSeconds,
    revealText: normalizePrizeText(revealText),
  };
}
export function prizePhase(run: PrizeRun | null, now: number) {
  if (!run) return { visible: false, revealed: false, remaining: 0 };
  const clock = run.pausedAt ?? now;
  const remaining = Math.max(0, Math.ceil((run.endAt - clock) / 1000));
  return {
    visible:
      clock < run.endAt ||
      run.revealSeconds === 0 ||
      clock < run.endAt + run.revealSeconds * 1000,
    revealed: clock >= run.endAt,
    remaining,
  };
}
export function parsePrizeRun(raw: string | null): PrizeRun | null {
  try {
    const r = JSON.parse(raw ?? "null");
    if (
      !r ||
      typeof r.prizeId !== "string" ||
      !r.prizeId ||
      typeof r.name !== "string" ||
      ![r.startedAt, r.endAt, r.revealSeconds].every(Number.isFinite) ||
      r.startedAt < 0 ||
      r.endAt <= r.startedAt ||
      r.endAt > 8.64e15 ||
      r.revealSeconds < 0 ||
      (r.pausedAt !== undefined &&
        (!Number.isFinite(r.pausedAt) ||
          r.pausedAt < 0 ||
          r.pausedAt > 8.64e15))
    )
      return null;
    return { ...r, revealText: normalizePrizeText(r.revealText) };
  } catch {
    return null;
  }
}
export function prizeClock(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor(seconds / 60) % 60,
    s = seconds % 60;
  return (
    (h > 0 ? `${String(h).padStart(2, "0")}:` : "") +
    `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  );
}
export type PreparedPrize = {
  prizeId: string;
  seconds: number;
  revealSeconds: number;
  revealText: string;
};
export const PREPARED_PRIZE_KEY = "torah-ore-prepared-prize-v1";
export function parsePreparedPrize(raw: string | null): PreparedPrize | null {
  try {
    const p = JSON.parse(raw ?? "null");
    if (!p || typeof p.prizeId !== "string") return null;
    const validated = newPrizeRun(
      p.prizeId,
      "prepared",
      p.seconds,
      p.revealSeconds,
      Date.now(),
      p.revealText,
    );
    return {
      prizeId: p.prizeId,
      seconds: p.seconds,
      revealSeconds: p.revealSeconds,
      revealText: validated.revealText,
    };
  } catch {
    return null;
  }
}

export const prizeRevealTimes = [
  { seconds: 20, label: "20 seconds" },
  { seconds: 60, label: "1 minute" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 900, label: "15 minutes" },
  { seconds: 1800, label: "30 minutes" },
  { seconds: 3600, label: "1 hour" },
  { seconds: 7200, label: "2 hours" },
  { seconds: 14400, label: "4 hours" },
  { seconds: 28800, label: "8 hours" },
  { seconds: 0, label: "Until I hide it" },
];
export function normalizePrizeText(value: unknown) {
  if (value === undefined) return "";
  if (typeof value !== "string")
    throw new Error("Enter valid prize reveal text.");
  const text = value.replace(/\r\n?/g, "\n").trim();
  if (text.length > 160 || text.split("\n").length > 3)
    throw new Error("Use up to 160 characters and 3 lines for the prize text.");
  return text;
}
export function prizeRevealDuration(
  hours: number,
  minutes: number,
  seconds: number,
) {
  if (hours === 0 && minutes === 0 && seconds === 0) return 0;
  return prizeDuration(hours, minutes, seconds);
}
export function updatePrizeReveal(
  run: PrizeRun,
  revealSeconds: number,
  revealText: string,
) {
  const validated = newPrizeRun(
    run.prizeId,
    run.name,
    1,
    revealSeconds,
    0,
    revealText,
  );
  return {
    ...run,
    revealSeconds: validated.revealSeconds,
    revealText: validated.revealText,
  };
}

export type PrizeOptions = {
  countdownSeconds: number;
  revealSeconds: number;
  revealText: string;
};
export const defaultPrizeOptions: PrizeOptions = {
  countdownSeconds: 300,
  revealSeconds: 20,
  revealText: "",
};
export function validatePrizeOptions(options: PrizeOptions): PrizeOptions {
  if (
    !Number.isSafeInteger(options.countdownSeconds) ||
    !Number.isSafeInteger(options.revealSeconds)
  )
    throw new Error("Use whole seconds for prize timings.");
  const validated = newPrizeRun(
    "settings",
    "Prize",
    options.countdownSeconds,
    options.revealSeconds,
    0,
    options.revealText,
  );
  return {
    countdownSeconds: options.countdownSeconds,
    revealSeconds: validated.revealSeconds,
    revealText: validated.revealText,
  };
}
export function savedPrizeOptions(prize: Partial<PrizeOptions>): PrizeOptions {
  const countdownSeconds =
    Number.isSafeInteger(prize.countdownSeconds) && prize.countdownSeconds! > 0
      ? prize.countdownSeconds!
      : 300;
  const revealSeconds =
    Number.isSafeInteger(prize.revealSeconds) && prize.revealSeconds! >= 0
      ? prize.revealSeconds!
      : 20;
  let revealText = "";
  try {
    revealText = normalizePrizeText(prize.revealText);
  } catch {
    /* Recover older/corrupt metadata without losing the image. */
  }
  try {
    return validatePrizeOptions({
      countdownSeconds,
      revealSeconds,
      revealText,
    });
  } catch {
    return { ...defaultPrizeOptions, revealText };
  }
}
export function prizeHoldRemaining(
  run: PrizeRun | null,
  now: number,
): number | null {
  return !run || run.revealSeconds === 0
    ? null
    : Math.max(
        0,
        Math.ceil(
          (run.endAt + run.revealSeconds * 1000 - (run.pausedAt ?? now)) / 1000,
        ),
      );
}
export function pausePrizeRun(run: PrizeRun, now = Date.now()): PrizeRun {
  return run.pausedAt !== undefined || !prizePhase(run, now).visible
    ? run
    : { ...run, pausedAt: now };
}
export function resumePrizeRun(run: PrizeRun, now = Date.now()): PrizeRun {
  if (run.pausedAt === undefined) return run;
  const { pausedAt, ...active } = run;
  const endAt = run.endAt + (now - pausedAt);
  return { ...active, startedAt: Math.min(run.startedAt, endAt - 1), endAt };
}
export function revealPrizeRun(run: PrizeRun, now = Date.now()): PrizeRun {
  const { pausedAt: _, ...active } = run;
  return { ...active, startedAt: Math.min(run.startedAt, now - 1), endAt: now };
}
