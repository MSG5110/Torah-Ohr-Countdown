import { getPhotos, preparePhoto, writePhotos, photoTask, validatePhoto, type Photo } from "./storage";
export type ImportIssue = { name: string; message: string };
export type ImportProgress = { done: number; total: number; name: string; added: number; skipped: number };
export type GalleryState = {
  photos: Photo[]; ready: boolean; progress: ImportProgress | null;
  saving: boolean; storageError: string; issues: ImportIssue[]; summary: string;
};
type Services = {
  read: () => Promise<Photo[]>;
  write: (photos: Photo[], clear: boolean) => Promise<void>;
  prepare: typeof preparePhoto;
  fingerprint: (file: File) => Promise<string | undefined>;
  id: () => string;
};
function photoId() {
  try { if (typeof crypto.randomUUID === "function") return crypto.randomUUID(); } catch { /* Offline viewers may restrict crypto. */ }
  return `photo-${Date.now().toString(36)}-${++idSerial}-${Math.random().toString(36).slice(2)}`;
}
let idSerial = 0;
async function fingerprint(file: File) {
  try {
    if (!globalThis.crypto?.subtle) return undefined;
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  } catch { return undefined; }
}
const services: Services = { read: getPhotos, write: writePhotos, prepare: preparePhoto, fingerprint, id: photoId };
function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
export class PhotoLibrary {
  private state: GalleryState = { photos: [], ready: false, progress: null, saving: false, storageError: "", issues: [], summary: "" };
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private readFailed = false;
  private version = 0;
  private savedVersion = 0;
  private flushing?: Promise<void>;
  private abort?: AbortController;
  private failed: File[] = [];
  onFirstAdded?: () => void;
  constructor(private service: Services = services) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<GalleryState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l());
  }
  load() {
    return this.loading ??= this.service.read().then(photos => {
      this.readFailed = false;
      this.publish({ photos, ready: true });
    }).catch(error => {
      this.readFailed = true;
      this.publish({ ready: true, storageError: message(error) });
    });
  }
  receiveRemote(photos:Photo[]){
    if(this.state.progress||this.state.saving||this.state.storageError)return;
    if(photos.length!==this.state.photos.length||photos.some((p,i)=>this.state.photos[i]!==p))this.publish({photos});
  }
  private change(photos: Photo[]) {
    this.version++;
    this.publish({ photos: photos.map((p, order) => p.order === order ? p : { ...p, order }), summary: "" });
    void this.save();
  }
  save = (): Promise<void> => {
    if (this.flushing) return this.flushing;
    this.publish({ saving: true });
    // Defer the loop so this.flushing is assigned even when a service throws.
    const task = Promise.resolve().then(async () => {
      do {
        try {
          if (this.readFailed) {
            // Never replace an unread library with just the new session's files.
            const stored = await this.service.read();
            if (this.readFailed) {
              const local = this.state.photos;
              const ids = new Set(local.map(p => p.id));
              const hashes = new Set(local.map(p => p.sourceFingerprint).filter(Boolean));
              const photos = [...stored.filter(p => !ids.has(p.id) && !(p.sourceFingerprint && hashes.has(p.sourceFingerprint))), ...local];
              this.readFailed = false;
              this.version++;
              this.publish({ photos: photos.map((p,order) => p.order === order ? p : { ...p, order }) });
            }
          }
          const version = this.version, snapshot = [...this.state.photos];
          await this.service.write(snapshot, true);
          this.savedVersion = version;
          this.publish({ storageError: "" });
        } catch (error) {
          this.publish({ storageError: `${message(error)} Changes are kept for this session. Retry saving or export the HTML.` });
          break;
        }
      } while (this.savedVersion !== this.version);
    }).finally(() => {
      this.flushing = undefined;
      this.publish({ saving: false });
    });
    this.flushing = task;
    return task;
  };
  replace = (next: Photo) => {
    if (!this.state.photos.some(p => p.id === next.id)) return;
    this.change(this.state.photos.map(p => p.id === next.id ? next : p));
  };
  remove = (ids: string[]) => {
    const selected = new Set(ids);
    this.change(this.state.photos.filter(p => !selected.has(p.id)));
  };
  clear = () => { this.cancel(); this.readFailed = false; this.change([]); this.publish({ summary: "Gallery cleared." }); };
  move = (id: string, to: number) => {
    const next = [...this.state.photos], from = next.findIndex(p => p.id === id);
    if (from < 0 || to < 0 || to >= next.length || from === to) return;
    next.splice(to, 0, next.splice(from, 1)[0]); this.change(next);
  };
  sortByName = () => this.change([...this.state.photos].sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })));
  reverse = () => this.change([...this.state.photos].reverse());
  cancel = () => { this.abort?.abort(); };
  retry = () => this.importFiles([...this.failed]);
  get canRetry() { return this.failed.length > 0; }
  importFiles = async (input: Iterable<File>, skipDuplicates = true) => {
    const files = Array.from(input);
    if (!files.length || this.abort) return;
    const controller = new AbortController(); this.abort = controller;
    this.failed = [];
    this.publish({ progress: { done: 0, total: files.length, name: "Preparing…", added: 0, skipped: 0 }, issues: [], summary: "" });
    let done = 0, added = 0, skipped = 0;
    const issues: ImportIssue[] = [];
    try {
      await this.load();
      for (const file of files) {
        if (controller.signal.aborted) break;
        this.publish({ progress: { done, total: files.length, name: file.name, added, skipped } });
        try {
          validatePhoto(file);
          const sourceFingerprint = await photoTask(this.service.fingerprint(file), controller.signal, "Reading photo", 15000).catch(error => {
            if (controller.signal.aborted) throw error;
            return undefined;
          });
          if (controller.signal.aborted) break;
          if (skipDuplicates && sourceFingerprint && this.state.photos.some(p => p.sourceFingerprint === sourceFingerprint)) { skipped++; continue; }
          const prepared = await this.service.prepare(file, controller.signal);
          if (controller.signal.aborted) break;
          const photo: Photo = { ...prepared, id: this.service.id(), name: file.name, order: this.state.photos.length, sourceFingerprint };
          this.change([...this.state.photos, photo]);
          if (added++ === 0) this.onFirstAdded?.();
        } catch (error) {
          if (controller.signal.aborted) break;
          issues.push({ name: file.name, message: message(error) }); this.failed.push(file);
          this.publish({ issues: [...issues] });
        } finally {
          done++;
          this.publish({ progress: { done, total: files.length, name: file.name, added, skipped } });
        }
      }
    } finally {
      this.abort = undefined;
      this.publish({ progress: null, issues, summary: `${added} added${skipped ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}${issues.length ? ` · ${issues.length} failed` : ""}${controller.signal.aborted ? " · Stopped" : ""}` });
      await this.flushing;
    }
  };
  snapshot = async () => { await this.load(); await this.flushing; return [...this.state.photos]; };
}
