import { readdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function files(dir) {
  let out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "sw.js") continue;
    const p = dir + "/" + e.name;
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push("/" + p.replace(/^dist\//, ""));
  }
  return out;
}
const assets = await files("dist");
const hash = createHash("sha256");
for (const asset of assets) hash.update(await readFile("dist" + asset));
const key = "torah-ore-" + hash.digest("hex").slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(key)}, ASSETS=${JSON.stringify(assets)};self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('torah-ore-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin||new URL(e.request.url).pathname.startsWith('/api/'))return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('/index.html'):Response.error())))});`,
);
