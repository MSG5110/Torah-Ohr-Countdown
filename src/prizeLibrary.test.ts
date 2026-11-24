import { describe, it, expect } from "vitest";
import {
  savedPrizeOptions,
  validatePrizeOptions,
  newPrizeRun,
  pausePrizeRun,
  resumePrizeRun,
  revealPrizeRun,
  prizePhase,
  prizeHoldRemaining,
  parsePrizeRun,
} from "./prizeEngine";
describe("saved prize library settings", () => {
  it("migrates images without a countdown while preserving existing reveal options", () => {
    expect(
      savedPrizeOptions({ revealSeconds: 7200, revealText: "A special prize" }),
    ).toEqual({
      countdownSeconds: 300,
      revealSeconds: 7200,
      revealText: "A special prize",
    });
    expect(
      savedPrizeOptions({
        countdownSeconds: NaN,
        revealSeconds: -3,
        revealText: undefined,
      }),
    ).toEqual({ countdownSeconds: 300, revealSeconds: 20, revealText: "" });
    expect(savedPrizeOptions({ revealSeconds: 0 }).revealSeconds).toBe(0);
  });
  it("keeps different prizes and their active snapshots independent", () => {
    const a = validatePrizeOptions({
        countdownSeconds: 120,
        revealSeconds: 7200,
        revealText: "Prize A",
      }),
      b = validatePrizeOptions({
        countdownSeconds: 3600,
        revealSeconds: 0,
        revealText: "Prize B",
      });
    const activeA = newPrizeRun(
        "a",
        "A",
        a.countdownSeconds,
        a.revealSeconds,
        1000,
        a.revealText,
      ),
      snapshot = JSON.stringify(activeA);
    const activeB = newPrizeRun(
      "b",
      "B",
      b.countdownSeconds,
      b.revealSeconds,
      5000,
      b.revealText,
    );
    expect(activeB.endAt).toBe(3605000);
    expect(activeB.revealText).toBe("Prize B");
    expect(JSON.stringify(activeA)).toBe(snapshot);
    expect(a.countdownSeconds).toBe(120);
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });
  it("rejects incomplete and invalid timings without overwriting saved values", () => {
    const saved = validatePrizeOptions({
      countdownSeconds: 90,
      revealSeconds: 7200,
      revealText: "Saved",
    });
    for (const countdownSeconds of [0, -1, NaN, Infinity, 0.5, 1e15])
      expect(() =>
        validatePrizeOptions({ ...saved, countdownSeconds }),
      ).toThrow();
    for (const revealSeconds of [-1, NaN, Infinity, 0.5])
      expect(() => validatePrizeOptions({ ...saved, revealSeconds })).toThrow();
    expect(saved.countdownSeconds).toBe(90);
  });
});
describe("live prize controls", () => {
  it("holds a paused countdown across refresh and arbitrarily long sleeps", () => {
    const run = newPrizeRun("a", "A", 60, 20, 1000),
      paused = pausePrizeRun(run, 31000),
      restored = parsePrizeRun(JSON.stringify(paused));
    expect(prizePhase(restored, 9e9)).toEqual({
      visible: true,
      revealed: false,
      remaining: 30,
    });
    expect(pausePrizeRun(paused, 9e9)).toBe(paused);
    const resumed = resumePrizeRun(restored!, 500000);
    expect(resumed.pausedAt).toBeUndefined();
    expect(resumed.startedAt).toBe(run.startedAt);
    expect(prizePhase(resumed, 500000).remaining).toBe(30);
    expect(prizePhase(resumed, 530000).revealed).toBe(true);
  });
  it("pauses and resumes the reveal hold without resetting elapsed reveal time", () => {
    const run = newPrizeRun("a", "A", 10, 20, 1000),
      paused = pausePrizeRun(run, 16000);
    expect(prizeHoldRemaining(paused, 9e9)).toBe(15);
    expect(prizePhase(paused, 9e9).visible).toBe(true);
    const resumed = resumePrizeRun(paused, 1000000);
    expect(prizeHoldRemaining(resumed, 1000000)).toBe(15);
    expect(prizePhase(resumed, 1014999).visible).toBe(true);
    expect(prizePhase(resumed, 1015000).visible).toBe(false);
    expect(prizeHoldRemaining({ ...resumed, revealSeconds: 0 }, 9e9)).toBe(
      null,
    );
  });
  it("reveals immediately from a paused countdown and starts the correct hold", () => {
    const run = pausePrizeRun(
        newPrizeRun("a", "A", 600, 7200, 1000, "Message"),
        5000,
      ),
      revealed = revealPrizeRun(run, 10000);
    expect(revealed.pausedAt).toBeUndefined();
    expect(prizePhase(revealed, 10000)).toEqual({
      visible: true,
      revealed: true,
      remaining: 0,
    });
    expect(prizeHoldRemaining(revealed, 10000)).toBe(7200);
    expect(revealed.revealText).toBe("Message");
    expect(run.endAt).toBe(601000);
  });
  it("does not pause an expired prize or restart an already running one on resume", () => {
    const run = newPrizeRun("a", "A", 10, 20, 1000);
    expect(pausePrizeRun(run, 31000)).toBe(run);
    expect(resumePrizeRun(run, 9e9)).toBe(run);
    expect(prizePhase(null, 9e9).visible).toBe(false);
  });
  it("preserves paused remaining time when the local wall clock is corrected backwards", () => {
    const run = newPrizeRun("a", "A", 60, 20, 1000000);
    const paused = pausePrizeRun(run, 1030000),
      resumed = resumePrizeRun(paused, 900000);
    expect(prizePhase(resumed, 900000).remaining).toBe(30);
    expect(parsePrizeRun(JSON.stringify(resumed))).toEqual(resumed);
    const pausedAfterCorrection = pausePrizeRun(run, 900000);
    expect(parsePrizeRun(JSON.stringify(pausedAfterCorrection))).toEqual(
      pausedAfterCorrection,
    );
    expect(prizePhase(pausedAfterCorrection, 9e9).remaining).toBe(160);
  });
  it("rejects corrupt pause timestamps while retaining legacy runs", () => {
    const run = newPrizeRun("a", "A", 60, 20, 1000);
    expect(parsePrizeRun(JSON.stringify(run))).toEqual(run);
    for (const pausedAt of [-1, null, "soon", 9e15])
      expect(parsePrizeRun(JSON.stringify({ ...run, pausedAt }))).toBe(null);
  });
});
