import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
const html = await readFile("standalone/torah-ore.html", "utf8");
assert.match(html, /data-standalone="true"/);
assert.match(html, /viewport-fit=cover/);
assert.doesNotMatch(html, /<script[^>]+src=/i);
assert.doesNotMatch(html, /<link[^>]+(?:stylesheet|modulepreload)/i);
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(css && script, "CSS and JavaScript are embedded");
for (const match of css.matchAll(/url\(([^)]+)\)/g))
  assert.match(match[1], /^['"]?data:(font\/|image\/svg\+xml)/);
assert.match(css, /@media\s*\(max-width:\s*650px\)/);
assert.match(css, /\.touch-settings/);
assert.match(css, /grid-template-columns:\s*1fr 1fr/);
assert.match(css, /\.cinema \.digit\s*\{[^}]*width:\s*0?\.52em/);
assert.match(script, /data:image\/png;base64,/);
assert.doesNotMatch(script, /uViewProjection/);
assert.match(script, /native-image/);
assert.doesNotMatch(html, /photo-ink-canvas/);
new Script(script);
for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
  new Script(match[1]);
assert.match(html, /id="startup-status"/);
assert.match(html, /Open compatibility mode/);

assert.match(script, /dataset.standalone/);
assert.match(script, /Open event settings/);
console.log(
  "Standalone checks passed: embedded JS/CSS/fonts, classic-script syntax, no external resource tags, phone layout and touch controls.",
);
