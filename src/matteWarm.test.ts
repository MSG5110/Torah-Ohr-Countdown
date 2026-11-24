import { beforeEach, afterEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  posts: [] as { id: number; seed: number }[],
}));
vi.mock("./matte.worker?worker&inline", () => ({
  default: class {
    onmessage: ((event: unknown) => void) | undefined;
    onerror: unknown;
    terminate() {}
    postMessage(request: { id: number; seed: number }) {
      state.posts.push(request);
      queueMicrotask(() =>
        this.onmessage?.({
          data: {
            id: request.id,
            blob: new Blob(["matte"], { type: "image/png" }),
          },
        }),
      );
    }
  },
}));
let m: typeof import("./mattePreparation");
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  state.posts = [];
  vi.stubGlobal("Worker", class {});
  vi.stubGlobal("OffscreenCanvas", class {});
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode() {
        return Promise.resolve();
      }
    },
  );
  m = await import("./mattePreparation");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const request = (seed: number) => ({
  kind: "ink" as const,
  seed,
  width: 768,
  height: 432,
});
it("reuses the prepared full-quality matte instead of solving it during the handoff", async () => {
  m.warmMatte(request(1));
  const lease = await m.prepareMatte(request(1), new AbortController().signal);
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0]).toMatchObject({ seed: 1, width: 768, height: 432 });
  lease.revoke();
});
it("bounds prefetched fields and expires unused work", async () => {
  m.warmMatte(request(1));
  m.warmMatte(request(2));
  m.warmMatte(request(3));
  await Promise.resolve();
  await Promise.resolve();
  const lease = await m.prepareMatte(request(3), new AbortController().signal);
  expect(state.posts).toHaveLength(3);
  lease.revoke();
  await vi.advanceTimersByTimeAsync(31000);
  const next = await m.prepareMatte(request(2), new AbortController().signal);
  expect(state.posts).toHaveLength(4);
  next.revoke();
});
it("does not run expensive ink solving on the UI thread when workers are unavailable", async () => {
  vi.stubGlobal("Worker", undefined);
  await expect(
    m.prepareMatte(request(1), new AbortController().signal),
  ).rejects.toThrow("worker");
  expect(state.posts).toHaveLength(0);
});
