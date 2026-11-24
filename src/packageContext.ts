import type { Settings } from "./engine";
import type { Photo } from "./storage";
import type { PrizePhoto } from "./prizeStore";
import type { PrizeRun, PreparedPrize } from "./prizeEngine";
export type PackedPhoto = Omit<PrizePhoto, "blob" | "thumbnail"> & {
  data: string;
  thumbnailData?: string;
};
export type EventPackage = {
  version: 1;
  id: string;
  exportedAt: string;
  settings: Settings;
  photos: PackedPhoto[];
  prizes: PackedPhoto[];
  run: PrizeRun | null;
  prepared: PreparedPrize | null;
};
export const PACKAGE_ELEMENT = "torah-ore-package";
export const MEDIA_MARKER = "__torah_package_written__";
let embedded: EventPackage | null = null;
let photos: Photo[] = [],
  prizes: PrizePhoto[] = [];
const volatile = new Map<string, string | null>();
export function storageName(name: string) {
  return embedded ? `${name}-${embedded.id}` : name;
}
function initialValue(key: string) {
  if (!embedded) return null;
  if (key === "torah-ore-settings-v1") return JSON.stringify(embedded.settings);
  if (key === "torah-ore-prize-run-v1")
    return embedded.run ? JSON.stringify(embedded.run) : null;
  if (key === "torah-ore-prepared-prize-v1")
    return embedded.prepared ? JSON.stringify(embedded.prepared) : null;
  return null;
}
// Exported files have independent storage. Explicit removal is a tombstone so
// stopping a bundled prize never starts it again on refresh.
const CLEARED = "__torah_explicitly_cleared__";
type SharedStorageAdapter={get:(key:string)=>string|null;set:(key:string,value:string|null)=>void};
let sharedAdapter:SharedStorageAdapter|undefined;
export function setSharedStorageAdapter(adapter:SharedStorageAdapter){sharedAdapter=adapter;}
export const appStorage = {
  getItem(key: string) {
    if(sharedAdapter)return sharedAdapter.get(key);
    const scoped = storageName(key);
    if (volatile.has(scoped)) return volatile.get(scoped) ?? null;
    try {
      const saved = localStorage.getItem(scoped);
      if (saved !== null) return saved === CLEARED ? null : saved;
    } catch (error) {
      if (!embedded) throw error;
    }
    return initialValue(key);
  },
  setItem(key: string, value: string) {
    if(sharedAdapter)return sharedAdapter.set(key,value);
    const scoped = storageName(key);
    volatile.set(scoped, value);
    localStorage.setItem(scoped, value);
  },
  removeItem(key: string) {
    if(sharedAdapter)return sharedAdapter.set(key,null);
    const scoped = storageName(key);
    volatile.set(scoped, null);
    if (embedded) localStorage.setItem(scoped, CLEARED);
    else localStorage.removeItem(scoped);
  },
};
export function embeddedPhotos() {
  return photos;
}
export function embeddedPrizes() {
  return prizes;
}
export function hasPackage() {
  return embedded !== null;
}
export function parseEventPackage(raw: string): EventPackage {
  const p = JSON.parse(raw);
  if (
    !p ||
    p.version !== 1 ||
    typeof p.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(p.id) ||
    !p.settings ||
    typeof p.settings !== "object" ||
    !Array.isArray(p.photos) ||
    !Array.isArray(p.prizes)
  )
    throw new Error(
      "This event file contains an invalid or unsupported package.",
    );
  for (const item of [...p.photos, ...p.prizes]) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      typeof item.name !== "string" ||
      !Number.isFinite(item.order)
    )
      throw new Error("The event file contains invalid image information.");
    for (const data of [item.data, item.thumbnailData].filter(
      (v) => v !== undefined,
    ))
      if (
        typeof data !== "string" ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]*={0,2}$/.test(data)
      )
        throw new Error("An embedded photograph or prize image is invalid.");
    if (typeof item.data !== "string")
      throw new Error("An embedded image is missing.");
  }
  return p;
}
export function jsonForHTML(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export function blobFromData(data: string) {
  const comma = data.indexOf(","),
    type = data.slice(5, data.indexOf(";"));
  const binary = atob(data.slice(comma + 1)),
    chunks: Uint8Array[] = [];
  for (let offset = 0; offset < binary.length; offset += 65536) {
    const part = binary.slice(offset, offset + 65536),
      bytes = new Uint8Array(part.length);
    for (let i = 0; i < part.length; i++) bytes[i] = part.charCodeAt(i);
    chunks.push(bytes);
  }
  return new Blob(chunks as BlobPart[], { type });
}
export async function initializePackage(
  raw = document.getElementById(PACKAGE_ELEMENT)?.textContent ?? "",
) {
  if (!raw) return;
  const p = parseEventPackage(raw);
  const unpack = async (items: PackedPhoto[]) => {
    const out: PrizePhoto[] = [];
    for (const { data, thumbnailData, ...metadata } of items) {
      out.push({
        ...metadata,
        blob: blobFromData(data),
        thumbnail: thumbnailData ? blobFromData(thumbnailData) : undefined,
      });
      // Yield between photographs so opening a large event remains responsive.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return out;
  };
  const nextPhotos = await unpack(p.photos),
    nextPrizes = await unpack(p.prizes);
  embedded = { ...p, photos: [], prizes: [] };
  photos = nextPhotos;
  prizes = nextPrizes;
  if (typeof document !== "undefined")
    document.getElementById(PACKAGE_ELEMENT)?.remove();
}
