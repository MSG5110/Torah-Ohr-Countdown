import {sharedEnabled,cloudPhotos,saveCloudPhotos} from "./sharedClient";
import {
  storageName,
  embeddedPhotos,
  hasPackage,
  MEDIA_MARKER,
} from "./packageContext";
import { decodeImage } from "./compatibility";
import { photoLuminance } from "./photoFraming";
import type { PhotoFocus, PhotoAnalysis } from "./photoFraming";
export type Photo = PhotoFocus & {
  id: string;
  name: string;
  blob: Blob;
  order: number;
  analysis?: PhotoAnalysis;
  thumbnail?: Blob;
  sourceFingerprint?: string;
  remoteUrl?:string;thumbnailUrl?:string;mediaPath?:string;thumbnailPath?:string;bytes?:number;
};
let database: Promise<IDBDatabase> | undefined;
let lastWritten = new Map<string, Photo>();
let writes: Promise<void> = Promise.resolve();
function storageError(error: unknown) {
  if (error instanceof DOMException && error.name === "QuotaExceededError")
    return new Error("Photo storage is full. Remove unused photos or export your HTML to keep a portable copy.");
  return error instanceof Error ? error : new Error("Photo storage is unavailable.");
}
function db() {
  if (database) return database;
  database = new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => fail(new Error("Photo storage did not respond.")), 5000);
    const fail = (error: unknown) => {
      clearTimeout(timeout);
      if (settled) return;
      settled = true; reject(storageError(error));
    };
    try {
      const request = indexedDB.open(storageName("torah-ore-media"), 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("photos"))
          request.result.createObjectStore("photos", { keyPath: "id" });
      };
      request.onsuccess = () => {
        clearTimeout(timeout);
        const d = request.result;
        if (settled) { d.close(); return; }
        settled = true;
        d.onversionchange = () => { d.close(); database = undefined; lastWritten.clear(); };
        d.onclose = () => { database = undefined; lastWritten.clear(); };
        resolve(d);
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error("Photo storage is blocked. Close other copies of this countdown, then retry saving."));
    } catch (error) { fail(error); }
  }).catch(error => { database = undefined; throw error; });
  return database;
}
export async function getPhotos(): Promise<Photo[]> {
  if(sharedEnabled())return cloudPhotos();
  try {
    const d = await db();
    return await new Promise<Photo[]>((resolve, reject) => {
      const transaction = d.transaction("photos");
      const timeout = setTimeout(() => {
        try { transaction.abort(); } catch { /* Already complete. */ }
        reject(new Error("Photo storage did not respond."));
      }, 8000);
      const request = transaction.objectStore("photos").getAll();
      const fail = () => { clearTimeout(timeout); reject(storageError(transaction.error ?? (request.readyState === "done" ? request.error : null))); };
      transaction.onabort = fail; transaction.onerror = fail;
      request.onerror = fail;
      request.onsuccess = () => {
        clearTimeout(timeout);
        const rows = hasPackage() && !request.result.some((p: Photo) => p?.id === MEDIA_MARKER)
          ? embeddedPhotos() : request.result;
        resolve(rows.filter((p: Photo) => p && p.blob instanceof Blob && typeof p.id === "string").sort((a: Photo,b: Photo) => a.order-b.order));
      };
    });
  } catch (error) { if (hasPackage()) return embeddedPhotos(); throw error; }
}
export function writePhotos(photos: Photo[], clear = false) {
  if(sharedEnabled())return saveCloudPhotos(photos);
  const snapshot = [...photos];
  const task = writes.then(async () => {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const transaction = d.transaction("photos", "readwrite"), store = transaction.objectStore("photos");
      const timeout = setTimeout(() => {
        try { transaction.abort(); } catch { /* Already complete. */ }
        reject(new Error("Saving photos timed out. Retry saving."));
      }, 15000);
      let writeError: unknown;
      const fail = () => { clearTimeout(timeout); reject(storageError(writeError ?? transaction.error)); };
      transaction.onabort = fail; transaction.onerror = fail;
      transaction.oncomplete = () => { clearTimeout(timeout); lastWritten = new Map(snapshot.map(p => [p.id,p])); resolve(); };
      // Replace membership atomically, but avoid rewriting every full-resolution
      // blob when only one picture or its position changed.
      const keys = store.getAllKeys();
      keys.onsuccess = () => {
        try {
          const present = new Set(keys.result), wanted = new Set(snapshot.map(p => p.id));
          if (hasPackage()) { wanted.add(MEDIA_MARKER); store.put({ id: MEDIA_MARKER }); }
          if (clear) for (const id of present) if (!wanted.has(String(id))) store.delete(id);
          for (const photo of snapshot)
            if (!present.has(photo.id) || lastWritten.get(photo.id) !== photo) store.put(photo);
        } catch (error) {
          writeError = error;
          try { transaction.abort(); } catch { fail(); }
        }
      };
    });
  });
  writes = task.catch(() => {});
  return task;
}
function cancelled() { return new DOMException("Photo import stopped", "AbortError"); }
export function photoTask<T>(task: Promise<T>, signal: AbortSignal | undefined, label: string, timeout = 30000, onLate?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown, value?: T) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(value as T);
    };
    const abort = () => finish(cancelled());
    const timer = setTimeout(() => finish(new Error(`${label} took too long. Try this photo again or export it as JPG.`)), timeout);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    task.then(value => { if (settled) onLate?.(value); else finish(undefined, value); }, error => finish(error));
  });
}
export function validatePhoto(file: File) {
  if (/\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type))
    throw new Error("HEIC/HEIF is not supported here. On your phone, export this photo as JPG, then add it again.");
  if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type.toLowerCase()) && !/\.(jpe?g|png|webp)$/i.test(file.name))
    throw new Error("Choose JPG, PNG or WebP.");
  if (file.size > 60 * 1024 * 1024)
    throw new Error(`${file.name}: maximum upload size is 60 MB.`);
}
async function processPhoto(
  file: File,
  metadata: boolean,
  signal?: AbortSignal,
): Promise<{ blob: Blob; thumbnail?: Blob; analysis?: PhotoAnalysis }> {
  if (signal?.aborted) throw cancelled();
  validatePhoto(file);
  const original = ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ? file : file.slice(0, file.size, /\.png$/i.test(file.name) ? "image/png" : /\.webp$/i.test(file.name) ? "image/webp" : "image/jpeg");
  let bitmap: ImageBitmap | HTMLImageElement;
  let localUrl: string | null = null;
  try {
    if (typeof createImageBitmap !== "function")
      throw new Error("Use image decoder");
    bitmap = await photoTask(createImageBitmap(file), signal, "Photo decoding", 20000, bitmap => bitmap.close());
  } catch {
    if (signal?.aborted) throw cancelled();
    localUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = localUrl;
    try {
      await photoTask(decodeImage(image), signal, "Photo decoding", 20000);
      bitmap = image;
    } catch {
      image.src = "";
      URL.revokeObjectURL(localUrl);
      if (signal?.aborted) throw cancelled();
      throw new Error("Could not read this photo. Try opening it first, or export a new JPG/PNG copy.");
    }
  }
  try {
    if (signal?.aborted) throw cancelled();
    if (!bitmap.width || !bitmap.height) throw new Error("This image has no usable pixels.");
    const ratio = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bitmap.width * ratio);
    c.height = Math.round(bitmap.height * ratio);
    const context = c.getContext("2d");
    if (!context) return { blob: original };
    context.drawImage(bitmap, 0, 0, c.width, c.height);
    const encode = (canvas: HTMLCanvasElement, quality: number) =>
      photoTask(new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Could not process image")),
          "image/webp",
          quality,
        ),
      ), signal, "Photo preparation", 20000);
    // Encoding is an optimization, not a reason to discard a decoded photo.
    const main = encode(c, 0.94).catch(error => {
      if (signal?.aborted) throw error;
      return original;
    });
    let analysis: PhotoAnalysis | undefined,
      thumbnail: Promise<Blob | undefined> = Promise.resolve(undefined);
    if (metadata) {
      try {
      const sample = document.createElement("canvas");
      sample.width = 64;
      sample.height = 36;
      const sg = sample.getContext("2d", { willReadFrequently: true });
      if (sg) {
        try {
          sg.drawImage(bitmap, 0, 0, 64, 36);
          analysis = photoLuminance(sg.getImageData(0, 0, 64, 36).data);
        } catch {
          /* Image remains usable if sampling is unavailable. */
        }
      }
      const thumb = document.createElement("canvas"),
        ts = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
      thumb.width = Math.max(1, Math.round(bitmap.width * ts));
      thumb.height = Math.max(1, Math.round(bitmap.height * ts));
      const tg = thumb.getContext("2d");
      if (tg) {
        tg.drawImage(bitmap, 0, 0, thumb.width, thumb.height);
        thumbnail = encode(thumb, 0.82).catch(() => undefined);
      }
      } catch { /* Optional preview/analysis cannot discard a decoded photo. */ }
    }
    const [blob, small] = await Promise.all([main, thumbnail]);
    return { blob, thumbnail: small, analysis };
  } finally {
    if ("close" in bitmap) bitmap.close();
    if (localUrl) URL.revokeObjectURL(localUrl);
  }
}

export async function optimize(file: File): Promise<Blob> {
  return (await processPhoto(file, false)).blob;
}
export async function preparePhoto(file: File, signal?: AbortSignal) {
  return processPhoto(file, true, signal);
}
