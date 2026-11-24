import { saveExportDraft } from "./exportDraft";
import type { Settings } from "./engine";
import type { Photo } from "./storage";
import type { PrizePhoto } from "./prizeStore";
import type { PrizeRun, PreparedPrize } from "./prizeEngine";
import {
  PACKAGE_ELEMENT,
  jsonForHTML,
  type EventPackage,
  type PackedPhoto,
} from "./packageContext";
let originalShell: string | undefined;
export function captureStandaloneShell() {
  if (document.documentElement.dataset.standalone === "true") {
    const oldData = document.getElementById(PACKAGE_ELEMENT);
    oldData?.remove();
    originalShell = "<!doctype html>\n" + document.documentElement.outerHTML;
    if (oldData) document.head.append(oldData);
  }
}
export function dataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("An image could not be included in the export."));
    reader.readAsDataURL(blob);
  });
}
export async function makeEventPackage(
  input: {
    settings: Settings;
    photos: Photo[];
    prizes: PrizePhoto[];
    run: PrizeRun | null;
    prepared: PreparedPrize | null;
  },
  progress: (message: string) => void = () => {},
): Promise<EventPackage> {
  const settings = { ...input.settings };
  const groups = [
    input.photos.map((p) => ({ ...p })),
    input.prizes.map((p) => ({ ...p })),
  ];
  const total = groups.reduce((n, g) => n + g.length, 0);
  let done = 0;
  const pack = async (rows: PrizePhoto[]) => {
    const result: PackedPhoto[] = [];
    for (const { blob, thumbnail, remoteUrl,thumbnailUrl,mediaPath:_media,thumbnailPath:_thumb, ...metadata } of rows) {
      progress(`Packing images ${++done} / ${total}`);
      result.push({
        ...metadata,
        data: await dataURL(remoteUrl?await(await fetch(remoteUrl)).blob():blob),
        thumbnailData: thumbnailUrl?await dataURL(await(await fetch(thumbnailUrl)).blob()):thumbnail ? await dataURL(thumbnail) : undefined,
      });
    }
    return result;
  };
  // A filesystem/served logo is embedded byte for byte, just like an uploaded logo.
  const logo = document.querySelector<HTMLImageElement>(".original-logo");
  const logoSource =
    settings.logo ?? (logo?.naturalWidth ? logo.currentSrc || logo.src : null);
  if (logoSource && !logoSource.startsWith("data:")) {
    try {
      const response = await fetch(logoSource);
      if (!response.ok) throw new Error("Logo unavailable");
      settings.logo = await dataURL(await response.blob());
    } catch {
      throw new Error("Upload the original logo in Event before exporting.");
    }
  }
  return {
    version: 1,
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    exportedAt: new Date().toISOString(),
    settings,
    photos: await pack(groups[0]),
    prizes: await pack(groups[1]),
    run: input.run ? { ...input.run } : null,
    prepared: input.prepared ? { ...input.prepared } : null,
  };
}
export function embedEventPackage(shell: string, data: EventPackage) {
  // The shell is captured before React mounts, with any old package removed.
  // Avoid building a second DOM containing all embedded fonts, JS and photos:
  // older iPhone viewers can terminate their web view at that memory peak.
  const root = shell.match(/<html\b[^>]*>/i)?.[0];
  if (!root || !/data-standalone\s*=\s*["']true["']/i.test(root) || !/<\/head\s*>/i.test(shell))
    throw new Error("Open the standalone Torah Ore HTML file to export a complete event.");
  const cleanRoot = root.replace(/\sdata-app-ready(?:=["'][^"']*["'])?/i, "");
  const cleanShell = shell.replace(root, () => cleanRoot);
  const payload = `<script id="${PACKAGE_ELEMENT}" type="application/json">${jsonForHTML(data)}</script>`;
  return cleanShell.replace(/<\/head\s*>/i, () => payload + "</head>");

}
export async function prepareEvent(
  input: Parameters<typeof makeEventPackage>[0],
  progress: (message: string) => void,
) {
  let shell = originalShell;
  if (!shell) {
    const response = await fetch(new URL("./torah-ore.html", location.href));
    if (!response.ok)
      throw new Error(
        "Open the standalone Torah Ore HTML file to export your event.",
      );
    shell = await response.text();
  }
  const data = await makeEventPackage(input, progress);
  progress("Building your HTML file…");
  const html = embedEventPackage(shell, data),
    blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const result = { html, blob, bytes: blob.size, photos: data.photos.length, prizes: data.prizes.length };
  progress("Keeping a recovery copy…");
  const recoverySaved = await saveExportDraft(result).catch(() => false);
  return { ...result, recoverySaved };
}
export function downloadEvent(blob: Blob) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url;
  link.download = "torah-ore-ready.html";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function exportEvent(input: Parameters<typeof makeEventPackage>[0], progress: (message: string) => void) {
  const result = await prepareEvent(input, progress);
  downloadEvent(result.blob);
  return result;
}
