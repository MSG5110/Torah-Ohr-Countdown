import { describe, it, expect, vi, afterEach } from "vitest";
import { loadSettings } from "./engine";
import {
  createPhotoSequence,
  advancePhotoSequence,
  currentPhotoId,
  nextPhotoId,
  reconcilePhotoSequence,
} from "./photoSequence";
const ids = ["a", "b", "c", "d", "e"];
function seeded(seed = 1) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
afterEach(() => vi.unstubAllGlobals());
describe("photo playback ordering", () => {
  it("loops in the saved gallery order by default", () => {
    let sequence = createPhotoSequence(ids, "ordered");
    const played = [];
    for (let i = 0; i < 12; i++) {
      played.push(currentPhotoId(sequence));
      expect(nextPhotoId(sequence)).toBe(ids[(i + 1) % ids.length]);
      sequence = advancePhotoSequence(sequence);
    }
    expect(played).toEqual([...ids, ...ids, "a", "b"]);
  });
  it("shows each photo once per shuffle round and never repeats at a round boundary", () => {
    const random = seeded(19);
    let sequence = createPhotoSequence(ids, "shuffle", undefined, random);
    const rounds = [];
    let previous;
    for (let cycle = 0; cycle < 100; cycle++) {
      const round = [];
      for (let i = 0; i < ids.length; i++) {
        const current = currentPhotoId(sequence),
          expectedNext = nextPhotoId(sequence);
        expect(current).not.toBe(previous);
        round.push(current);
        previous = current;
        sequence = advancePhotoSequence(sequence, random);
        expect(currentPhotoId(sequence)).toBe(expectedNext);
      }
      expect([...round].sort()).toEqual(ids);
      rounds.push(round.join());
    }
    expect(new Set(rounds).size).toBeGreaterThan(20);
    expect(ids).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("handles no photos, one photo and two photos indefinitely", () => {
    const empty = createPhotoSequence([], "shuffle");
    expect(currentPhotoId(empty)).toBeUndefined();
    expect(nextPhotoId(empty)).toBeUndefined();
    expect(advancePhotoSequence(empty)).toBe(empty);
    for (const list of [["a"], ["a", "b"]]) {
      let sequence = createPhotoSequence(list, "shuffle", undefined, seeded());
      for (let i = 0; i < 500; i++) {
        const previous = currentPhotoId(sequence);
        sequence = advancePhotoSequence(sequence);
        if (list.length > 1)
          expect(currentPhotoId(sequence)).not.toBe(previous);
        else expect(currentPhotoId(sequence)).toBe("a");
        expect(sequence.cycle.length).toBe(list.length);
        expect(sequence.following.length).toBe(list.length);
      }
    }
  });
  it("keeps the current photo when toggling order, then uses the real next gallery item", () => {
    const sequence = createPhotoSequence(ids, "shuffle", "c", seeded());
    const ordered = reconcilePhotoSequence(sequence, ids, "ordered");
    expect(currentPhotoId(ordered)).toBe("c");
    expect(nextPhotoId(ordered)).toBe("d");
    const random = reconcilePhotoSequence(ordered, ids, "shuffle", seeded());
    expect(currentPhotoId(random)).toBe("c");
    expect(nextPhotoId(random)).not.toBe("c");
    expect([...random.cycle].sort()).toEqual(ids);
  });
  it("preserves an active shuffle through metadata edits and follows gallery edits", () => {
    const sequence = createPhotoSequence(ids, "shuffle", "c", seeded());
    expect(reconcilePhotoSequence(sequence, [...ids], "shuffle")).toBe(
      sequence,
    );
    const reordered = reconcilePhotoSequence(
      sequence,
      ["a", "b", "d", "c", "e"],
      "ordered",
    );
    expect(currentPhotoId(reordered)).toBe("c");
    expect(nextPhotoId(reordered)).toBe("e");
    const removed = reconcilePhotoSequence(sequence, ["a", "b"], "shuffle");
    expect(removed.cycle).not.toContain("c");
    expect(removed.following).not.toContain("c");
    const added = reconcilePhotoSequence(sequence, [...ids, "f"], "shuffle");
    expect(currentPhotoId(added)).toBe("c");
    expect([...added.cycle].sort()).toEqual([...ids, "f"]);
  });
  it("restores the order preference and migrates old or invalid settings to gallery order", () => {
    for (const [value, expected] of [
      ["shuffle", "shuffle"],
      ["ordered", "ordered"],
      [undefined, "ordered"],
      ["invalid", "ordered"],
    ]) {
      vi.stubGlobal("localStorage", {
        getItem: () => JSON.stringify({ photoOrder: value, deadline: 123456 }),
      });
      const { settings } = loadSettings();
      expect(settings.photoOrder).toBe(expected);
      expect(settings.deadline).toBe(123456);
    }
  });
});
