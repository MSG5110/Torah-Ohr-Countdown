import { describe, it, expect } from "vitest";
import { crossedHour, photosHidden } from "./cinema";
describe("hourly pulse", () => {
  it("triggers once at each absolute-hour boundary, including day rollover", () => {
    for (const hour of [1, 2, 24, 240]) {
      const n = hour * 3600;
      expect(crossedHour(n + 1, n)).toBe(false);
      expect(crossedHour(n, n - 1)).toBe(true);
      expect(crossedHour(n + 1, n - 1)).toBe(true);
    }
  });
  it("does not pulse for refresh, finale, backward time or sleep/preview jumps", () => {
    for (const [old, now] of [
      [3600, 3600],
      [1, 0],
      [3600, 7200],
      [7200, 3500],
      [864000, 10],
    ])
      expect(crossedHour(old, now)).toBe(false);
  });
});
describe("photo cutoff", () => {
  it("keeps blended photos throughout the final minute until ten seconds", () => {
    for (const remaining of [60, 59, 30, 11])
      expect(photosHidden("blended", true, remaining)).toBe(false);
    for (const remaining of [10, 9, 1, 0])
      expect(photosHidden("blended", true, remaining)).toBe(true);
  });
  it("respects display modes and unconfigured events", () => {
    expect(photosHidden("blended", true, null)).toBe(false);
    expect(photosHidden("cinematic", true, 600)).toBe(true);
    expect(photosHidden("blended", false, 600)).toBe(true);
    expect(photosHidden("photos", true, 0)).toBe(false);
  });
});
