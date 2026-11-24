import { describe, it, expect } from "vitest";
import {
  units,
  remaining,
  startPreview,
  activeTarget,
  parseDeadline,
} from "./engine";
describe("countdown boundaries", () => {
  it.each([
    [864000, 4],
    [86401, 4],
    [86400, 4],
    [86399, 3],
    [3600, 3],
    [3599, 2],
    [60, 2],
    [59, 1],
    [10, 1],
    [0, 1],
    [-10, 1],
  ])("%s seconds has %s units", (s, n) => {
    expect(units(s)).toHaveLength(n);
    expect(units(s).every((u) => u.value >= 0)).toBe(true);
  });
  it("uses a wall clock and catches up after sleep", () => {
    expect(remaining(10000, 0)).toBe(10);
    expect(remaining(10000, 9750)).toBe(1);
    expect(remaining(10000, 10000)).toBe(0);
    expect(remaining(10000, 20000)).toBe(0);
  });
  it("preserves days above 99", () =>
    expect(units(123 * 86400)[0].value).toBe(123));
  it("formats rollover components", () =>
    expect(units(86401).map((x) => x.value)).toEqual([1, 0, 0, 1]));
});
describe("preview isolation", () => {
  it("exits back to the identical live deadline", () => {
    const real = parseDeadline("2027-01-01T20:00");
    const preview = startPreview(60, 1000);
    expect(activeTarget(real, preview)).toBe(61000);
    expect(activeTarget(real, null)).toBe(real);
    expect(remaining(preview!.target, 62000)).toBe(0);
    expect(activeTarget(real, null)).toBe(real);
  });
  it("can rehearse without an event", () => {
    expect(activeTarget(null, startPreview(10, 1000))).toBe(11000);
    expect(activeTarget(null, null)).toBe(null);
  });
  it("supports settled launch preview", () =>
    expect(remaining(startPreview(-30, 100000)!.target, 100000)).toBe(0));
});
describe("Jerusalem deadlines", () => {
  it("applies winter and summer offsets", () => {
    expect(new Date(parseDeadline("2027-01-15T20:00")).toISOString()).toBe(
      "2027-01-15T18:00:00.000Z",
    );
    expect(new Date(parseDeadline("2027-07-15T20:00")).toISOString()).toBe(
      "2027-07-15T17:00:00.000Z",
    );
  });
  it("rejects invalid dates and nonexistent spring hour", () => {
    expect(() => parseDeadline("not-a-date")).toThrow();
    expect(() => parseDeadline("2027-03-26T02:30")).toThrow();
  });
  it("rejects ambiguous fall hour", () =>
    expect(() => parseDeadline("2027-10-31T01:30")).toThrow());
});
