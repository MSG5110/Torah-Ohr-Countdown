import MatteWorker from "./matte.worker?worker&inline";
import { makeMattePixels, type MatteRequest } from "./matteModel";
import { decodeImage } from "./compatibility";
type Pending = {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
};
let worker: Worker | undefined,
  unavailable = false,
  serial = 0,
  idleTimer: ReturnType<typeof setTimeout> | undefined;
const pending = new Map<number, Pending>();
function stopIdle() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = undefined;
  }
}
function releaseWorker() {
  if (pending.size) return;
  stopIdle();
  idleTimer = setTimeout(() => {
    worker?.terminate();
    worker = undefined;
    idleTimer = undefined;
  }, 60000);
}
function getWorker() {
  stopIdle();
  if (
    unavailable ||
    typeof Worker === "undefined" ||
    typeof OffscreenCanvas === "undefined"
  )
    return undefined;
  if (worker) return worker;
  try {
    worker = new MatteWorker();
    worker.onmessage = (
      e: MessageEvent<{ id: number; blob?: Blob; error?: string }>,
    ) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.blob) p.resolve(e.data.blob);
      else p.reject(new Error(e.data.error ?? "Matte preparation failed"));
      releaseWorker();
    };
    worker.onerror = (event) => {
      event.preventDefault();
      unavailable = true;
      worker?.terminate();
      worker = undefined;
      for (const p of pending.values())
        p.reject(new Error("Matte worker unavailable"));
      pending.clear();
    };
    return worker;
  } catch {
    unavailable = true;
    return undefined;
  }
}
function aborted() {
  return new DOMException("Reveal cancelled", "AbortError");
}
async function fallback(r: Omit<MatteRequest, "id">, signal: AbortSignal) {
  // Older viewers get one small idle-time preparation, never a per-frame photo copy.
  await new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(() => resolve(), { timeout: 200 });
    else setTimeout(resolve, 0);
  });
  if (signal.aborted) throw aborted();
  const c = document.createElement("canvas");
  c.width = r.width;
  c.height = r.height;
  const g = c.getContext("2d");
  if (!g) throw new Error("Matte unavailable");
  const image = g.createImageData(r.width, r.height);
  image.data.set(makeMattePixels(r));
  g.putImageData(image, 0, 0);
  return new Promise<Blob>((resolve, reject) =>
    c.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Matte encoding failed")),
      "image/png",
    ),
  );
}
async function prepareBlob(r: Omit<MatteRequest, "id">, signal: AbortSignal) {
  if (signal.aborted) throw aborted();
  let blob: Blob;
  const w = getWorker();
  if (w) {
    try {
      blob = await new Promise<Blob>((resolve, reject) => {
        const id = ++serial;
        const timeout = setTimeout(() => {
          const job = pending.get(id);
          pending.delete(id);
          job?.reject(new Error("Matte preparation timed out"));
          releaseWorker();
        }, 3000);
        const cancel = () => {
          pending.delete(id);
          clearTimeout(timeout);
          reject(aborted());
          releaseWorker();
        };
        signal.addEventListener("abort", cancel, { once: true });
        pending.set(id, {
          resolve: (b) => {
            clearTimeout(timeout);
            signal.removeEventListener("abort", cancel);
            resolve(b);
          },
          reject: (e) => {
            clearTimeout(timeout);
            signal.removeEventListener("abort", cancel);
            reject(e);
          },
        });
        try {
          w.postMessage({ ...r, id });
        } catch (error) {
          const job = pending.get(id);
          pending.delete(id);
          job?.reject(
            error instanceof Error ? error : new Error(String(error)),
          );
          releaseWorker();
        }
      });
    } catch (error) {
      if (signal.aborted || r.kind === "ink") throw error;
      blob = await fallback(r, signal);
    }
  } else {
    if (r.kind === "ink")
      throw new Error(
        "Ink preparation needs a worker; using a smooth native blend.",
      );
    blob = await fallback(r, signal);
  }
  if (signal.aborted) throw aborted();
  return blob;
}
type WarmEntry = {
  promise: Promise<Blob>;
  controller: AbortController;
  timer?: ReturnType<typeof setTimeout>;
};
const warmCache = new Map<string, WarmEntry>();
const matteKey = (r: Omit<MatteRequest, "id">) =>
  `${r.kind}:${r.seed}:${r.width}:${r.height}`;
export function warmMatte(r: Omit<MatteRequest, "id">) {
  const key = matteKey(r);
  if (warmCache.has(key)) return;
  while (warmCache.size >= 2) {
    const oldest = warmCache.keys().next().value!;
    const old = warmCache.get(oldest)!;
    warmCache.delete(oldest);
    clearTimeout(old.timer);
    old.controller.abort();
  }
  const controller = new AbortController(),
    entry: WarmEntry = {
      controller,
      promise: prepareBlob(r, controller.signal),
    };
  warmCache.set(key, entry);
  entry.timer = setTimeout(() => {
    if (warmCache.get(key) === entry) warmCache.delete(key);
    controller.abort();
  }, 30000);
  void entry.promise.catch(() => {
    clearTimeout(entry.timer);
    if (warmCache.get(key) === entry) warmCache.delete(key);
  });
}
export async function prepareMatte(
  r: Omit<MatteRequest, "id">,
  signal: AbortSignal,
) {
  if (signal.aborted) throw aborted();
  const key = matteKey(r),
    warm = warmCache.get(key);
  if (warm) {
    warmCache.delete(key);
    clearTimeout(warm.timer);
  }
  const blob = await (warm ? warm.promise : prepareBlob(r, signal));
  if (signal.aborted) throw aborted();
  const url = URL.createObjectURL(blob);
  let revoked = false;
  const revoke = () => {
    if (!revoked) {
      URL.revokeObjectURL(url);
      revoked = true;
    }
  };
  try {
    const image = new Image();
    image.src = url;
    await decodeImage(image);
    if (signal.aborted) throw aborted();
    return { url, revoke };
  } catch (error) {
    revoke();
    throw error;
  }
}
