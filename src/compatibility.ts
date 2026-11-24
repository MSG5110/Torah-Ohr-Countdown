import type { Settings } from "./engine";
export function compatibilityMode() {
  return (
    document.documentElement.dataset.safeMode === "true" ||
    location.hash === "#safe"
  );
}
export function displaySettings(saved: Settings, safe: boolean): Settings {
  return safe
    ? {
        ...saved,
        quality: "low",
        density: 0,
        halo: false,
        lighting: 0,
        reduced: true,
        rolling: false,
        animation: 0,
        fireworks: false,
        confetti: false,
        shockwave: false,
        zoom: 0,
      }
    : saved;
}
export function watchReducedMotion(onChange: (value: boolean) => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const update = () => onChange(media.matches);
  update();
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }
  if (typeof media.addListener === "function") {
    media.addListener(update);
    return () => media.removeListener(update);
  }
  return () => {};
}
export function reducedMotionPreference() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
export function startupFailure(message: string) {
  const panel = document.getElementById("startup-status");
  const detail = document.getElementById("startup-detail");
  if (panel) panel.style.display = "block";
  if (detail) detail.textContent = message;
}

export function showPhotosOnly(
  mode: string,
  slideshow: boolean,
  ready: boolean,
  _seconds: number | null,
) {
  return (
    mode === "photos" && slideshow && ready
  );
}
export function decodeImage(image: HTMLImageElement): Promise<void> {
  if (typeof image.decode === "function") return image.decode();
  if (image.complete)
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error("Image could not load"));
  return new Promise((resolve, reject) => {
    const clear = () => {
      image.onload = null;
      image.onerror = null;
    };
    image.onload = () => {
      clear();
      resolve();
    };
    image.onerror = () => {
      clear();
      reject(new Error("Image could not load"));
    };
  });
}
