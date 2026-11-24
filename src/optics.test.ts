import { describe, expect, it } from "vitest";
import { glintEnvelope, launchOptics } from "./optics";
import { launchTimeline, zeroOpacity } from "./cinema";
describe("optical catches", () => {
  it("stays bounded and changes smoothly over dense frame samples", () => {
    for (const phase of [0.19, 1.7, 4.2])
      for (const activity of [0, 0.5, 1]) {
        let previous = glintEnvelope(0, phase, activity);
        for (let t = 0; t < 40; t += 1 / 60) {
          const value = glintEnvelope(t, phase, activity);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
          expect(Math.abs(value - previous)).toBeLessThan(0.03);
          previous = value;
        }
      }
  });
  it("does not synchronise all sparkle positions", () => {
    expect(glintEnvelope(2, 0.19, 0.7)).not.toBeCloseTo(
      glintEnvelope(2, 2.56, 0.7),
      3,
    );
  });
});
describe("zero-to-live light handoff", () => {
  it("remains idle before zero and after its one-shot reveal", () => {
    for (const time of [-100, -1, 6, 864000]) {
      const cue = launchOptics(time);
      expect(cue.gather + cue.release + cue.handoff).toBe(0);
    }
  });
  it("bridges the zero fade into the logo and title without a dead interval", () => {
    for (let t = 0.1; t < 4.8; t += 0.025) {
      const light = launchOptics(t),
        content = launchTimeline(t);
      expect(
        zeroOpacity(t) +
          light.gather +
          light.release +
          light.handoff +
          content.logo +
          content.title,
      ).toBeGreaterThan(0.2);
    }
    expect(launchTimeline(2.35).logo).toBeGreaterThan(0);
    expect(zeroOpacity(2.35)).toBeGreaterThan(0);
    expect(launchTimeline(2.8).title).toBeGreaterThan(0);
  });
  it("keeps envelopes continuous, finite and bounded through all cue boundaries", () => {
    let previous = launchOptics(-0.1);
    for (let t = -0.1; t < 8; t += 0.01) {
      const cue = launchOptics(t);
      for (const key of ["gather", "release", "handoff", "sheen"] as const) {
        expect(cue[key]).toBeGreaterThanOrEqual(0);
        expect(cue[key]).toBeLessThanOrEqual(1);
        expect(Math.abs(cue[key] - previous[key])).toBeLessThan(0.03);
      }
      previous = cue;
    }
  });
});
