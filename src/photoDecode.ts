import { decodeImage } from "./compatibility";
type Decoded = { naturalWidth: number; naturalHeight: number };
type Entry<T> = { task: Promise<T>; image?: T };
// Keep only the current/next decoded pictures, sharing the browser's original
// full-resolution pixels. No thumbnail or resized surrogate enters playback.
export class PhotoDecodeCache<T extends Decoded> {
  private entries = new Map<string, Entry<T>>();
  constructor(
    private load: (url: string) => Promise<T>,
    private capacity = 2,
    private pixelLimit = 20000000,
  ) {}
  get(url: string) {
    let entry = this.entries.get(url);
    if (entry) {
      this.entries.delete(url);
      this.entries.set(url, entry);
      return entry.task;
    }
    entry = { task: Promise.resolve().then(() => this.load(url)) };
    const current = entry;
    current.task = current.task.then(
      (image) => {
        if (this.entries.get(url) === current) {
          current.image = image;
          this.trim();
        }
        return image;
      },
      (error) => {
        if (this.entries.get(url) === current) this.entries.delete(url);
        throw error;
      },
    );
    this.entries.set(url, current);
    this.trim();
    return current.task;
  }
  private trim() {
    let pixels = [...this.entries.values()].reduce(
      (n, e) =>
        n + (e.image ? e.image.naturalWidth * e.image.naturalHeight : 0),
      0,
    );
    while (
      this.entries.size > 1 &&
      (this.entries.size > this.capacity || pixels > this.pixelLimit)
    ) {
      const key = this.entries.keys().next().value!;
      const item = this.entries.get(key)!;
      if (item.image)
        pixels -= item.image.naturalWidth * item.image.naturalHeight;
      this.entries.delete(key);
    }
  }
  retain(urls: string[]) {
    const keep = new Set(urls);
    for (const key of this.entries.keys())
      if (!keep.has(key)) this.entries.delete(key);
  }
  clear() {
    this.entries.clear();
  }
  get size() {
    return this.entries.size;
  }
}
export const decodedPhotos = new PhotoDecodeCache(async (url) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await decodeImage(image);
  return image;
});
