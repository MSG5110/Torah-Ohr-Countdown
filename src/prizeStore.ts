import {sharedEnabled,cloudPrizes,saveCloudPhotos} from "./sharedClient";
import {
  storageName,
  embeddedPrizes,
  hasPackage,
  MEDIA_MARKER,
} from "./packageContext";
import type { Photo } from "./storage";
import { savedPrizeOptions } from "./prizeEngine";
export type PrizePhoto = Photo & {
  countdownSeconds?: number;
  revealText?: string;
  revealSeconds?: number;
};
let database: Promise<IDBDatabase> | undefined;
async function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(
      () => fail(new Error("Prize storage did not respond.")),
      5000,
    );
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      database = undefined;
      reject(error);
    };
    const r = indexedDB.open(storageName("torah-ore-prizes"), 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("prizes", { keyPath: "id" });
    r.onsuccess = () => {
      if (settled) {
        r.result.close();
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(r.result);
    };
    r.onerror = () => fail(r.error);
    r.onblocked = () => fail(new Error("Prize storage is blocked."));
  }));
}
export async function readPrizes(): Promise<PrizePhoto[]> {
  if(sharedEnabled())return cloudPrizes();
  const d = await db().catch((error) => {
    if (hasPackage()) return null;
    throw error;
  });
  if (!d) return embeddedPrizes();
  return new Promise((resolve, reject) => {
    const r = d.transaction("prizes").objectStore("prizes").getAll();
    r.onsuccess = () =>
      resolve(
        (hasPackage() &&
        !r.result.some((p: PrizePhoto) => p?.id === MEDIA_MARKER)
          ? embeddedPrizes()
          : r.result
        )
          .filter(
            (p: PrizePhoto) =>
              p && typeof p.id === "string" && p.blob instanceof Blob,
          )
          .map((p: PrizePhoto, index: number) => ({
            ...p,
            name:
              typeof p.name === "string" && p.name.trim()
                ? p.name.trim().slice(0, 120)
                : "Unnamed prize",
            order: Number.isFinite(p.order) ? p.order : index,
            ...savedPrizeOptions(p),
          }))
          .sort((a: PrizePhoto, b: PrizePhoto) => a.order - b.order),
      );
    r.onerror = () => reject(r.error);
  });
}
export async function writePrizes(photos: PrizePhoto[]) {
  if(sharedEnabled())return saveCloudPhotos(photos,true);
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction("prizes", "readwrite"),
      s = t.objectStore("prizes");
    s.clear();
    if (hasPackage()) s.put({ id: MEDIA_MARKER });
    photos.forEach((p) => s.put(p));
    t.oncomplete = () => resolve();
    t.onabort = t.onerror = () =>
      reject(t.error ?? new Error("Could not save prize images."));
  });
}
