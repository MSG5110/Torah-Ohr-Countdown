import { describe, it, expect } from "vitest";
import {
  beginPhoto,
  completePhoto,
  emptyHandoff,
  failPhoto,
  type SlideItem,
} from "./photoHandoff";
import { photoTransitions } from "./photoTransitions";
const a: SlideItem = { url: "a", token: 1, seed: 1, style: "velvet" },
  b: SlideItem = { url: "b", token: 2, seed: 2, style: "wash" },
  c: SlideItem = { url: "c", token: 3, seed: 3, style: "glide" },
  d: SlideItem = { url: "d", token: 4, seed: 4, style: "veil" };
describe("seamless two-photo handoff", () => {
  it.each(photoTransitions)(
    "retains the complete outgoing photo during $label preparation and reveal",
    () => {
      const state = beginPhoto({ shown: a, incoming: null, pending: null }, b);
      expect(state.shown).toBe(a);
      expect(state.incoming).toBe(b);
      expect(completePhoto(state, 999)).toBe(state);
      expect(completePhoto(state, b.token)).toEqual({
        shown: b,
        incoming: null,
        pending: null,
      });
    },
  );
  it("queues only the latest skip instead of interrupting a partly painted image", () => {
    let state = beginPhoto({ shown: a, incoming: null, pending: null }, b);
    state = beginPhoto(beginPhoto(state, c), d);
    expect(state.shown).toBe(a);
    expect(state.incoming).toBe(b);
    expect(state.pending).toBe(d);
    expect(completePhoto(state, c.token)).toBe(state);
    state = completePhoto(state, b.token);
    expect(state).toEqual({ shown: b, incoming: d, pending: null });
    expect(completePhoto(state, d.token).shown).toBe(d);
  });
  it("does not restart camera or reveal animations on countdown renders", () => {
    const state = { shown: a, incoming: null, pending: null };
    expect(beginPhoto(state, { ...a, token: 99 })).toBe(state);
  });
  it("updates focal metadata without replacing the running image or token", () => {
    const state = beginPhoto({ shown: a, incoming: null, pending: null }, b),
      focus = { focalX: 0.8 };
    const next = beginPhoto(state, { ...b, token: 99, focus });
    expect(next.incoming?.token).toBe(b.token);
    expect(next.incoming?.focus).toBe(focus);
    expect(next.shown).toBe(a);
  });
  it("clears a queued skip when the latest choice is the incoming photo", () => {
    const state = beginPhoto(
      beginPhoto({ shown: a, incoming: null, pending: null }, b),
      c,
    );
    expect(beginPhoto(state, b).pending).toBe(null);
  });
  it("keeps the visible photo if decoding fails and proceeds to the pending one", () => {
    const state = beginPhoto(
      beginPhoto({ shown: a, incoming: null, pending: null }, b),
      c,
    );
    expect(failPhoto(state, b.token)).toEqual({
      shown: a,
      incoming: c,
      pending: null,
    });
    expect(failPhoto(state, 999)).toBe(state);
  });
  it("handles a first photo and an empty gallery", () => {
    const state = beginPhoto(emptyHandoff(), a);
    expect(completePhoto(state, a.token)).toEqual({
      shown: a,
      incoming: null,
      pending: null,
    });
    expect(failPhoto(state, a.token)).toEqual(emptyHandoff());
  });
});
