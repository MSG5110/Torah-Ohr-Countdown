import { colorDefaults } from "./colors";
export type Palette = typeof colorDefaults;
export type Scene = "aurora" | "silk" | "rays";
export type Theme = {
  id: string;
  name: string;
  description: string;
  scene: Scene;
  palette: Palette;
};
function palette(
  backgroundColor: string,
  atmosphereColor: string,
  accent: string,
  light: string,
  labels: string,
): Palette {
  return {
    backgroundColor,
    atmosphereColor,
    digitColor: accent,
    labelColor: labels,
    particleColor: accent,
    lightColor: light,
    haloColor: accent,
    fireworkColor: light,
    confettiColor: accent,
    launchColor: accent,
    photoTintColor: atmosphereColor,
    shockwaveColor: light,
  };
}
export const themes: Theme[] = [
  {
    id: "emerald",
    name: "Emerald & Champagne",
    description: "Deep green · warm gold",
    scene: "aurora",
    palette: { ...colorDefaults },
  },
  {
    id: "emerald-white",
    name: "Emerald & White",
    description: "The original green · white numbers",
    scene: "aurora",
    palette: { ...colorDefaults, digitColor: "#ffffff" },
  },
  {
    id: "sapphire",
    name: "Midnight Sapphire",
    description: "Ink blue · pale gold",
    scene: "silk",
    palette: palette("#030710", "#102746", "#dfc590", "#f5e5be", "#c4ccda"),
  },
  {
    id: "platinum",
    name: "Obsidian & Platinum",
    description: "Carbon black · silver",
    scene: "rays",
    palette: palette("#050608", "#20252e", "#d8dce5", "#f0f5ff", "#b8beca"),
  },
  {
    id: "burgundy",
    name: "Burgundy & Bronze",
    description: "Velvet wine · brushed bronze",
    scene: "silk",
    palette: palette("#0d0407", "#401522", "#d7a475", "#ffe0b5", "#cdb9b4"),
  },
  {
    id: "amethyst",
    name: "Royal Amethyst",
    description: "Deep violet · rose champagne",
    scene: "aurora",
    palette: palette("#080511", "#2b1647", "#dfb7b0", "#ffe7db", "#c6bdd8"),
  },
  {
    id: "amber",
    name: "Amber Nocturne",
    description: "Warm charcoal · copper light",
    scene: "rays",
    palette: palette("#0b0805", "#392618", "#e3bb78", "#ffe6b7", "#cabda5"),
  },
];
export function findTheme(id: string) {
  return themes.find((t) => t.id === id);
}
export function themePatch(id: string) {
  const theme = findTheme(id) ?? themes[0];
  return { theme: theme.id, ...theme.palette };
}
export function sceneFor(id: string): Scene {
  return findTheme(id)?.scene ?? "aurora";
}
