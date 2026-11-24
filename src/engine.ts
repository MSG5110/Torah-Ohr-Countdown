import { appStorage } from "./packageContext";
import type { PhotoOrder } from "./photoSequence";
import { photoTransitions, type PhotoTransition } from "./photoTransitions";
import { DateTime } from "luxon";
import { colorDefaults, validColor } from "./colors";
import { findTheme, themePatch } from "./themes";
export const ZONE = "Asia/Jerusalem";
export type Preview = { target: number; started: number } | null;
export function remaining(target: number, now: number) {
  return Math.max(0, Math.ceil((target - now) / 1000));
}
export function activeTarget(deadline: number | null, preview: Preview) {
  return preview?.target ?? deadline;
}
export function startPreview(seconds: number, now = Date.now()): Preview {
  return { target: now + seconds * 1000, started: now };
}
export function units(s: number) {
  s = Math.max(0, Math.floor(s));
  const all = [
    { id: "days", value: Math.floor(s / 86400) },
    { id: "hours", value: Math.floor(s / 3600) % 24 },
    { id: "minutes", value: Math.floor(s / 60) % 60 },
    { id: "seconds", value: s % 60 },
  ];
  return all.slice(s >= 86400 ? 0 : s >= 3600 ? 1 : s >= 60 ? 2 : 3);
}
export function parseDeadline(local: string) {
  const d = DateTime.fromISO(local, { zone: ZONE });
  if (!d.isValid || d.toFormat("yyyy-MM-dd'T'HH:mm") !== local)
    throw new Error(
      "This Jerusalem time does not exist. Choose a valid date and time.",
    );
  if (d.getPossibleOffsets().length > 1)
    throw new Error(
      "This time occurs twice when daylight saving ends. Choose a time outside the repeated hour.",
    );
  return d.toMillis();
}
export type Settings = typeof colorDefaults & {
  theme: string;
  photoTransition: PhotoTransition;
  photoOrder: PhotoOrder;
  adaptiveLight: boolean;
  photoOpacity: number;
  photoShade: number;
  deadline: number | null;
  title: string;
  launchText: string;
  preset: string;
  gold: number;
  density: number;
  speed: number;
  halo: boolean;
  haloIntensity: number;
  lighting: number;
  animation: number;
  scale: number;
  rolling: boolean;
  rollSpeed: number;
  dynamic: boolean;
  reduced: boolean;
  quality: string;
  slideshow: boolean;
  mode: string;
  duration: number;
  fade: number;
  zoom: number;
  fireworks: boolean;
  confetti: boolean;
  shockwave: boolean;
  fireworkIntensity: string;
  confettiIntensity: string;
  logo: string | null;
};
export const defaults: Settings = {
  ...colorDefaults,
  theme: "emerald",
  photoTransition: "velvet",
  photoOrder: "ordered",
  adaptiveLight: true,
  photoOpacity: 0.9,
  photoShade: 0.2,
  deadline: null,
  title: "A legacy of Torah. A future of light.",
  launchText: "WE ARE LIVE!!!",
  preset: "emerald",
  gold: 1,
  density: 60,
  speed: 1,
  halo: true,
  haloIntensity: 0.6,
  lighting: 1,
  animation: 1,
  scale: 1,
  rolling: true,
  rollSpeed: 550,
  dynamic: true,
  reduced: false,
  quality: "auto",
  slideshow: true,
  mode: "blended",
  duration: 20,
  fade: 3,
  zoom: 1,
  fireworks: true,
  confetti: true,
  shockwave: true,
  fireworkIntensity: "medium",
  confettiIntensity: "medium",
  logo: null,
};
export function loadSettings(): { settings: Settings; error: string } {
  try {
    const raw = appStorage.getItem("torah-ore-settings-v1");
    if (!raw) return { settings: defaults, error: "" };
    const data = JSON.parse(raw);
    const settings = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof Settings)[]) {
      const v = data[key];
      if (
        (v === null && ["deadline", "logo"].includes(key)) ||
        (typeof v === typeof defaults[key] && v !== undefined) ||
        (key === "deadline" && typeof v === "number") ||
        (key === "logo" && typeof v === "string")
      )
        Object.assign(settings, { [key]: v });
    }
    if (settings.deadline !== null && !Number.isFinite(settings.deadline))
      settings.deadline = null;
    const limits: Partial<Record<keyof Settings, [number, number]>> = {
      photoOpacity: [0.2, 1],
      photoShade: [0, 0.8],
      gold: [0.4, 1.5],
      density: [0, 140],
      speed: [0.1, 2],
      haloIntensity: [0, 1],
      lighting: [0, 1.5],
      animation: [0, 1.5],
      scale: [0.7, 1.15],
      rollSpeed: [400, 650],
      duration: [5, 90],
      fade: [0.5, 10],
      zoom: [0, 2],
    };
    for (const [key, [min, max]] of Object.entries(limits)) {
      const k = key as keyof Settings;
      const v = settings[k];
      Object.assign(settings, {
        [k]:
          typeof v === "number" && Number.isFinite(v)
            ? Math.min(max, Math.max(min, v))
            : defaults[k],
      });
    }
    for (const [key, values] of Object.entries({
      preset: ["emerald", "midnight", "forest"],
      quality: ["auto", "high", "low"],
      mode: ["blended", "cinematic", "photos"],
      photoOrder: ["ordered", "shuffle"],
      photoTransition: photoTransitions.map((t) => String(t.id)),
      fireworkIntensity: ["low", "medium", "high"],
      confettiIntensity: ["low", "medium", "high"],
    })) {
      if (!values.includes(String(settings[key as keyof Settings])))
        Object.assign(settings, { [key]: defaults[key as keyof Settings] });
    }
    for (const key of Object.keys(
      colorDefaults,
    ) as (keyof typeof colorDefaults)[])
      if (!validColor(settings[key])) settings[key] = colorDefaults[key];
    if (data.theme === undefined) {
      const legacyCustom = (
        Object.keys(colorDefaults) as (keyof typeof colorDefaults)[]
      ).some((key) => settings[key].toLowerCase() !== colorDefaults[key]);
      settings.theme = legacyCustom ? "saved" : "emerald";
    } else if (findTheme(settings.theme)) {
      Object.assign(settings, themePatch(settings.theme));
    } else if (settings.theme !== "saved") {
      Object.assign(settings, themePatch("emerald"));
    }
    settings.duration = Math.max(5, settings.duration);
    settings.fade = Math.min(
      settings.duration / 2,
      Math.max(0.2, settings.fade),
    );
    return { settings, error: "" };
  } catch {
    return {
      settings: defaults,
      error: "Settings storage unavailable. Changes may not survive refresh.",
    };
  }
}
