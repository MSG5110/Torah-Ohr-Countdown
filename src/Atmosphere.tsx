import { useEffect, useRef, useState } from "react";
import type { Settings } from "./engine";
import { rgba } from "./colors";
import { decodeImage } from "./compatibility";
import {
  backgroundSize,
  coverFrame,
  toneCurve,
  lightMotion,
  hazeMotion,
  rayMotion,
} from "./backgroundPhoto";
import plateSource from "./assets/cinematic-plate.png?inline";
let photograph: Promise<HTMLImageElement> | null = null;
function loadPlate() {
  return (photograph ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.src = plateSource;
    decodeImage(image)
      .then(() => resolve(image))
      .catch((error) => {
        photograph = null;
        reject(error);
      });
  }));
}
function grade(image: HTMLImageElement, s: Settings): CanvasImageSource {
  // Preserve the art-directed emerald master. Other themes get a consistent
  // shadow/midtone/highlight grade, calculated once rather than every frame.
  if (s.theme === "emerald" || s.theme === "emerald-white") return image;
  const c = document.createElement("canvas"),
    ratio = Math.min(1, 1600 / image.naturalWidth);
  c.width = Math.round(image.naturalWidth * ratio);
  c.height = Math.round(image.naturalHeight * ratio);
  const g = c.getContext("2d");
  if (!g) return image;
  try {
    g.drawImage(image, 0, 0, c.width, c.height);
    const pixels = g.getImageData(0, 0, c.width, c.height),
      curve = toneCurve(s.backgroundColor, s.atmosphereColor, s.lightColor);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const level =
        Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]) * 3;
      pixels.data[i] = curve[level];
      pixels.data[i + 1] = curve[level + 1];
      pixels.data[i + 2] = curve[level + 2];
    }
    g.putImageData(pixels, 0, 0);
    return c;
  } catch {
    return image;
  }
}
function hazeSprite(color: string) {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 160;
  const g = c.getContext("2d");
  if (!g) return c;
  g.scale(1, 0.5);
  for (let i = 0; i < 9; i++) {
    const x = 55 + ((i * 73) % 220),
      y = 80 + ((i * 47) % 160),
      r = 50 + ((i * 31) % 65),
      gradient = g.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, rgba(color, 0.11));
    gradient.addColorStop(0.45, rgba(color, 0.04));
    gradient.addColorStop(1, rgba(color, 0));
    g.fillStyle = gradient;
    g.fillRect(0, 0, 320, 320);
  }
  return c;
}
function radialSprite(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  if (!g) return c;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, rgba(color, 0.35));
  r.addColorStop(0.4, rgba(color, 0.05));
  r.addColorStop(1, rgba(color, 0));
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return c;
}
function raySprite(color: string) {
  const c = document.createElement("canvas");
  c.width = 192;
  c.height = 512;
  const g = c.getContext("2d");
  if (!g) return c;
  const cross = g.createLinearGradient(0, 0, 192, 0);
  cross.addColorStop(0, rgba(color, 0));
  cross.addColorStop(0.35, rgba(color, 0.18));
  cross.addColorStop(0.52, rgba(color, 0.26));
  cross.addColorStop(0.7, rgba(color, 0.13));
  cross.addColorStop(1, rgba(color, 0));
  g.fillStyle = cross;
  g.fillRect(0, 0, 192, 512);
  g.globalCompositeOperation = "destination-in";
  const falloff = g.createLinearGradient(0, 0, 0, 512);
  falloff.addColorStop(0, "#fff");
  falloff.addColorStop(0.7, "#fff5");
  falloff.addColorStop(1, "#fff0");
  g.fillStyle = falloff;
  g.fillRect(0, 0, 192, 512);
  return c;
}
export function Atmosphere({
  s,
  reduced,
  intensity,
}: {
  s: Settings;
  reduced: boolean;
  intensity: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    live = useRef({ s, reduced, intensity }),
    paint = useRef<() => void>(() => {}),
    elapsedClock = useRef(0),
    [source, setSource] = useState<CanvasImageSource | null>(null);
  live.current = { s, reduced, intensity };
  useEffect(() => {
    let cancelled = false;
    void loadPlate()
      .then((image) => {
        if (!cancelled) setSource(grade(image, s));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [s.theme, s.backgroundColor, s.atmosphereColor, s.lightColor]);
  useEffect(() => {
    const c = canvas.current!,
      g = c.getContext("2d");
    if (!g || !source) return;
    let raf = 0,
      last = 0,
      lastPaint = 0,
      time = elapsedClock.current,
      energy = live.current.intensity,
      budget = 1,
      slow = 0,
      quality = live.current.s.quality;
    const dimensions = source as HTMLImageElement | HTMLCanvasElement;
    const iw =
        "naturalWidth" in dimensions
          ? dimensions.naturalWidth
          : dimensions.width,
      ih =
        "naturalHeight" in dimensions
          ? dimensions.naturalHeight
          : dimensions.height;
    const haze = hazeSprite(live.current.s.atmosphereColor),
      ray = raySprite(live.current.s.lightColor),
      warmGlow = radialSprite(live.current.s.lightColor),
      haloGlow = radialSprite(live.current.s.haloColor);
    const resize = () => {
      const rect = c.getBoundingClientRect(),
        size = backgroundSize(
          rect.width || innerWidth,
          rect.height || innerHeight,
          live.current.s.quality,
          budget,
        );
      c.width = size.width;
      c.height = size.height;
    };
    const render = () => {
      const current = live.current,
        w = c.width,
        h = c.height,
        rect = coverFrame(iw, ih, w, h, time, current.reduced);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.fillStyle = current.s.backgroundColor;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = Math.min(
        1,
        0.45 + current.s.lighting * 0.5 + energy * 0.009 * current.s.lighting,
      );
      g.drawImage(source, rect.x, rect.y, rect.width, rect.height);
      g.globalAlpha = 1;
      // Independent soft layers move at a different depth than the photographic plate.
      g.globalCompositeOperation = "screen";
      for (let i = 0; i < 4; i++) {
        const air = hazeMotion(time, i, current.reduced),
          width = w * air.scale,
          height = h * 0.5;
        g.globalAlpha = air.opacity * current.s.lighting * (1 + energy * 0.08);
        g.drawImage(
          haze,
          w * air.x - width / 2,
          h * air.y - height / 2,
          width,
          height,
        );
      }
      g.globalAlpha = 1;
      const light = lightMotion(time, current.reduced);
      // Feathered rays pivot independently around the existing photographic source.
      for (let i = 0; i < 3; i++) {
        const beam = rayMotion(time, i, current.reduced);
        g.save();
        g.translate(w * light.x, -h * 0.12);
        g.rotate(beam.angle);
        g.globalAlpha = Math.min(
          1,
          beam.opacity * current.s.lighting * (1 + energy * 0.08),
        );
        g.drawImage(ray, (-w * beam.width) / 2, 0, w * beam.width, h * 1.65);
        g.restore();
      }
      const radius = w * 0.62;
      g.globalAlpha = Math.min(
        1,
        (current.s.lighting * light.strength * (0.08 + energy * 0.018)) / 0.35,
      );
      g.drawImage(
        warmGlow,
        w * light.x - radius,
        h * light.y - radius,
        radius * 2,
        radius * 2,
      );
      if (current.s.halo) {
        const radius = w * 0.48;
        g.globalAlpha = Math.min(
          1,
          (current.s.haloIntensity * (0.018 + energy * 0.004)) / 0.35,
        );
        g.drawImage(
          haloGlow,
          w * 0.5 - radius,
          h * 0.55 - radius,
          radius * 2,
          radius * 2,
        );
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      c.style.opacity = "1";
    };
    const frame = (now: number) => {
      const delta = last ? now - last : 16;
      last = now;
      const dt = Math.min(0.05, delta / 1000);
      if (!document.hidden) {
        const current = live.current;
        if (!current.reduced) time += dt * current.s.speed;
        elapsedClock.current = time;
        energy += (current.intensity - energy) * (1 - Math.exp(-dt * 0.65));
        const paintInterval =
          current.s.quality === "high"
            ? 1000 / 60
            : current.s.quality === "low"
              ? 1000 / 24
              : 1000 / 30;
        // A small tolerance avoids dropping every other paint on 59.94 Hz HDMI.
        if (now - lastPaint + 0.75 < paintInterval && !current.reduced) {
          raf = requestAnimationFrame(frame);
          return;
        }
        lastPaint = now;
        if (quality !== current.s.quality) {
          quality = current.s.quality;
          budget = 1;
          resize();
        }
        if (current.s.quality === "auto") {
          slow = delta > 30 ? slow + 1 : Math.max(0, slow - 2);
          if (slow > 90 && budget > 0.55) {
            budget *= 0.75;
            slow = 0;
            resize();
          }
        }
        render();
      }
      if (!live.current.reduced) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      resize();
      render();
    };
    paint.current = render;
    addEventListener("resize", onResize);
    resize();
    frame(performance.now());
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      paint.current = () => {};
    };
  }, [source, reduced]);
  useEffect(() => {
    if (reduced) paint.current();
  }, [s, reduced, intensity]);
  return (
    <>
      <img
        src={plateSource}
        alt=""
        className="photographic-master"
        aria-hidden="true"
      />
      <canvas
        ref={canvas}
        className="photographic-background cinematic-atmosphere"
        aria-hidden="true"
      />
    </>
  );
}
