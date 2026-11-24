import { decodeImage } from "./compatibility";
import { photoLuminance, type PhotoAnalysis } from "./photoFraming";
const cache = new WeakMap<Blob, Promise<PhotoAnalysis>>();
export function analyzePhoto(blob: Blob) {
  let result = cache.get(blob);
  if (result) return result;
  result = (async () => {
    const url = URL.createObjectURL(blob),
      image = new Image();
    image.src = url;
    try {
      await decodeImage(image);
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 36;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return { brightness: 0.4, highlights: 0 };
      g.drawImage(image, 0, 0, 64, 36);
      return photoLuminance(g.getImageData(0, 0, 64, 36).data);
    } finally {
      URL.revokeObjectURL(url);
    }
  })().catch(() => ({ brightness: 0.4, highlights: 0 }));
  cache.set(blob, result);
  return result;
}
