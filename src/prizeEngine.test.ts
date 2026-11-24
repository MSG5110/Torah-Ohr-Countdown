import { describe, expect, it } from "vitest";
import {
  newPrizeRun,
  prizeRevealDuration,
  prizeRevealTimes,
  normalizePrizeText,
  updatePrizeReveal,
  parsePreparedPrize,
  parsePrizeRun,
  prizeDuration,
  prizePhase,
  prizeClock,
} from "./prizeEngine";
import { activeTarget, startPreview } from "./engine";
describe("independent prize countdown", () => {
  it("accepts hours, minutes and seconds, including durations over a day", () => {
    expect(prizeDuration(0, 0, 1)).toBe(1);
    expect(prizeDuration(27, 15, 30)).toBe(98130);
    expect(prizeClock(98130)).toBe("27:15:30");
    expect(prizeClock(9)).toBe("00:09");
    for (const tuple of [
      [0, 0, 0],
      [-1, 0, 0],
      [0, 60, 0],
      [0, 0, 60],
      [0.5, 0, 0],
    ])
      expect(() =>
        prizeDuration(...(tuple as [number, number, number])),
      ).toThrow();
  });
  it("reveals exactly at zero and hides after the selected reveal time", () => {
    const run = newPrizeRun("one", "A prize", 10, 20, 1000);
    expect(prizePhase(run, 1000)).toEqual({
      visible: true,
      revealed: false,
      remaining: 10,
    });
    expect(prizePhase(run, 10999).remaining).toBe(1);
    expect(prizePhase(run, 11000)).toEqual({
      visible: true,
      revealed: true,
      remaining: 0,
    });
    expect(prizePhase(run, 30999).visible).toBe(true);
    expect(prizePhase(run, 31000).visible).toBe(false);
  });
  it("holds the revealed picture until stopped when reveal time is zero", () => {
    const run = newPrizeRun("one", "A prize", 10, 0, 1000);
    expect(prizePhase(run, 8e12)).toEqual({
      visible: true,
      revealed: true,
      remaining: 0,
    });
    expect(prizePhase(null, 8e12).visible).toBe(false);
  });
  it("recovers after refresh and sleep from the actual timestamp", () => {
    const run = newPrizeRun("one", "A prize", 60, 20, 1000),
      restored = parsePrizeRun(JSON.stringify(run));
    expect(restored).toEqual(run);
    expect(prizePhase(restored, 31000).remaining).toBe(30);
    expect(prizePhase(restored, 65000).revealed).toBe(true);
    expect(prizePhase(restored, 95000).visible).toBe(false);
  });
  it("does not affect or depend on the campaign deadline or its preview", () => {
    const deadline = 500000,
      run = newPrizeRun("one", "A prize", 10, 20, 1000),
      snapshot = JSON.stringify(run);
    expect(activeTarget(deadline, startPreview(5, 1000))).toBe(6000);
    expect(prizePhase(run, 4000).remaining).toBe(7);
    expect(JSON.stringify(run)).toBe(snapshot);
    expect(activeTarget(deadline, null)).toBe(deadline);
  });
  it("rejects corrupt runs and invalid durations instead of crashing", () => {
    for (const raw of [
      "bad",
      "{}",
      "null",
      JSON.stringify({
        prizeId: "one",
        name: "x",
        startedAt: 0,
        endAt: NaN,
        revealSeconds: 0,
      }),
      JSON.stringify({
        prizeId: "one",
        name: "x",
        startedAt: 20,
        endAt: 10,
        revealSeconds: 0,
      }),
    ])
      expect(parsePrizeRun(raw)).toBe(null);
    for (const seconds of [0, -1, Infinity, 1e15])
      expect(() => newPrizeRun("one", "x", seconds, 20)).toThrow();
    expect(() => newPrizeRun("one", "x", 10, -1)).toThrow();
  });
});

describe("long prize reveals and messages", () => {
  it("holds a two-hour reveal to its exact wall-clock expiry after reload or sleep", () => {
    const run = newPrizeRun(
      "a",
      "A prize",
      60,
      7200,
      1000,
      "Win a weekend in Jerusalem",
    );
    const restored = parsePrizeRun(JSON.stringify(run));
    expect(prizePhase(restored, run.endAt + 7199999).visible).toBe(true);
    expect(prizePhase(restored, run.endAt + 7200000).visible).toBe(false);
    expect(restored?.revealText).toBe("Win a weekend in Jerusalem");
    expect(prizeRevealTimes.some((p) => p.seconds === 7200)).toBe(true);
    expect(prizeRevealDuration(2, 30, 5)).toBe(9005);
    expect(prizeRevealDuration(0, 0, 0)).toBe(0);
    expect(() => prizeRevealDuration(0, 60, 0)).toThrow();
  });
  it("keeps messages with prepared prizes and migrates old runs without deleting them", () => {
    const text = "הפרס הבא\nA special prize";
    const prepared = parsePreparedPrize(
      JSON.stringify({
        prizeId: "a",
        seconds: 60,
        revealSeconds: 7200,
        revealText: text,
      }),
    );
    expect(prepared?.revealText).toBe(text);
    expect(prepared?.revealSeconds).toBe(7200);
    const run = newPrizeRun("a", "Prize", 5, 7200, 1000);
    const { revealText: _, ...legacy } = run;
    expect(parsePrizeRun(JSON.stringify(legacy))).toEqual({
      ...legacy,
      revealText: "",
    });
  });
  it("updates a visible prize without restarting either countdown", () => {
    const run = newPrizeRun("a", "Prize", 60, 20, 1000);
    const updated = updatePrizeReveal(run, 7200, "  New prize message  ");
    expect(updated.endAt).toBe(run.endAt);
    expect(updated.startedAt).toBe(run.startedAt);
    expect(updated.revealText).toBe("New prize message");
    expect(prizePhase(updated, run.endAt + 3600000).visible).toBe(true);
    expect(run.revealSeconds).toBe(20);
  });
  it("allows empty or multilingual text and validates length and line limits", () => {
    expect(normalizePrizeText(undefined)).toBe("");
    expect(normalizePrizeText("  One\r\nTwo  ")).toBe("One\nTwo");
    for (const bad of [null, 4, "x".repeat(161), "a\nb\nc\nd"])
      expect(() => normalizePrizeText(bad)).toThrow();
    expect(() =>
      updatePrizeReveal(newPrizeRun("a", "Prize", 5, 20), Infinity, "Message"),
    ).toThrow();
    expect(
      parsePreparedPrize(
        JSON.stringify({
          prizeId: "a",
          seconds: 60,
          revealSeconds: 20,
          revealText: { bad: true },
        }),
      ),
    ).toBe(null);
  });
});
