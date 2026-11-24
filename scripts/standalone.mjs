import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { Script } from "node:vm";

// Inline the actual production bundle; this preserves the complete app and avoids
// file:// module imports, font fetches, dependency installation and service workers.
let html = await readFile("dist/index.html", "utf8");
const cssPath = html.match(
  /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/,
)?.[1];
const scriptPath = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/)?.[1];
if (!cssPath || !scriptPath)
  throw new Error("Build assets not found. Run npm run build first.");
const assetPath = (path) => resolve("dist", path.replace(/^\//, ""));
let css = await readFile(assetPath(cssPath), "utf8");
const urls = [...css.matchAll(/url\(([^)]+)\)/g)];
for (const match of urls) {
  const url = match[1].replace(/^['"]|['"]$/g, "");
  if (url.startsWith("data:")) continue;
  if (/^https?:/.test(url))
    throw new Error("External stylesheet asset: " + url);
  const bytes = await readFile(assetPath(url));
  const type = extname(url) === ".woff2" ? "font/woff2" : "font/woff";
  css = css.replace(
    match[0],
    `url(data:${type};base64,${bytes.toString("base64")})`,
  );
}
const bootstrap = await readFile("scripts/bootstrap.html", "utf8");
const js = await readFile(assetPath(scriptPath), "utf8");
new Script(js); // Validate that the bundle parses without ES module semantics.
html = html.replace(
  '<html lang="en">',
  '<html lang="en" data-standalone="true">',
);
html = html.replace(
  /<link[^>]*rel="stylesheet"[^>]*>/,
  () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`,
);
html = html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/, () => "");
// Vite's self-contained JS contains no imports and is safe as a classic script.
// Put it after #root, because classic scripts run immediately.
html = html.replace(
  '<div id="root"></div>',
  () => '<div id="root"></div>' + bootstrap,
);
html = html.replace(
  "</body>",
  () => `<script>${js.replace(/<\/script/gi, "<\\/script")}</script></body>`,
);
html = html.replace(
  "</head>",
  `<!-- Barlow Condensed and Manrope fonts: SIL Open Font License 1.1.\n${(await readFile("public/licenses/Barlow-Condensed.txt", "utf8")).replace(/--/g, "—")}\n${(await readFile("public/licenses/Manrope.txt", "utf8")).replace(/--/g, "—")}\n--></head>`,
);
await mkdir("standalone", { recursive: true });
await writeFile("standalone/torah-ore.html", html);
await copyFile("standalone/torah-ore.html", "dist/torah-ore.html");
// Cache the export template as part of the complete offline web build too.
await import("./offline.mjs");

console.log(
  `Standalone HTML built: ${Buffer.byteLength(html).toLocaleString()} bytes. All CSS, JS and fonts embedded.`,
);
