// Uses only an isolated localhost review profile. Never point this at a live event browser.
import { writeFile, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";
const APP_URL = process.env.TORAH_APP_URL ?? "http://127.0.0.1:4177/";
if (
  process.env.TORAH_REVIEW_RESET !== "1" ||
  !["127.0.0.1", "localhost"].includes(new URL(APP_URL).hostname)
)
  throw new Error(
    "Use a fresh Chrome review profile and set TORAH_REVIEW_RESET=1. This test resets app data only on its localhost test origin.",
  );
function crc32(data) {
  let crc = -1;
  for (const byte of data) {
    crc ^= byte;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function png(bg, fg, transparent = false) {
  const w = 1600,
    h = 1000,
    channels = transparent ? 4 : 3,
    raw = Buffer.alloc((w * channels + 1) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const subject =
        (x - 400) ** 2 + (y - 500) ** 2 < 300 ** 2 ||
        (x > 1000 && x < 1400 && (y < 150 || y > 850));
      const color = subject ? fg : bg;
      const i = y * (w * channels + 1) + 1 + x * channels;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
      if (transparent) raw[i + 3] = subject ? 255 : 0;
    }
  const chunk = (type, data) => {
    const t = Buffer.from(type),
      len = Buffer.alloc(4),
      crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = transparent ? 6 : 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
async function createFixtures(out) {
  for (const [name, bg, fg] of [
    ["a", [12, 35, 24], [202, 170, 105]],
    ["b", [236, 230, 212], [30, 67, 93]],
    ["prize", [18, 27, 35], [224, 191, 115]],
  ])
    await writeFile(
      join(out, `torah-fixture-${name}.png`),
      png(bg, fg, name === "prize"),
    );
}

export async function connect() {
  const tabs = await (
    await fetch(
      `http://127.0.0.1:${process.env.TORAH_CDP_PORT ?? 9226}/json/list`,
    )
  ).json();
  const target = tabs.find(
    (t) => t.type === "page" && !t.url.startsWith("chrome:"),
  );
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === "Runtime.exceptionThrown")
      errors.push(m.params.exceptionDetails);
  });
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  await call("Runtime.enable");
  await call("Page.enable");
  return {
    call,
    errors,
    eval: async (expression) => {
      const response = await call("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (response.exceptionDetails)
        throw new Error(
          response.exceptionDetails.exception?.description ??
            response.exceptionDetails.text,
        );
      return response.result?.value;
    },
    shot: async (path) => {
      const p = await call("Page.captureScreenshot", { format: "png" });
      await writeFile(path, Buffer.from(p.data, "base64"));
    },
    close: () => ws.close(),
  };
}
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await connect(),
  results = [],
  limitations = [];
const out = await mkdtemp(join(tmpdir(), "torah-browser-review-"));
await createFixtures(out);
const check = (name, value) => {
  assert.ok(value, name);
  results.push(name);
  console.log("PASS", name);
};
async function clickText(text) {
  return b.eval(
    `(()=>{const el=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!el)throw new Error('Button not found: '+${JSON.stringify(text)});el.click();return true;})()`,
  );
}
async function key(key, code, modifiers = 0) {
  await b.call("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    modifiers,
  });
  await b.call("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    modifiers,
  });
  await delay(180);
}
async function tab(name) {
  if (!(await b.eval(`!!document.querySelector('.admin')`)))
    await key("F2", "F2");
  await clickText(name);
  await delay(180);
}
async function upload(selector, path) {
  const { root } = await b.call("DOM.getDocument");
  const { nodeId } = await b.call("DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  });
  assert.ok(nodeId, selector);
  await b.call("DOM.setFileInputFiles", { nodeId, files: path });
  await delay(100);
  let finished = false;
  for (let i = 0; i < 200; i++) {
    if (
      await b.eval(
        `!document.querySelector(${JSON.stringify(selector)})?.disabled`,
      )
    ) {
      finished = true;
      break;
    }
    await delay(100);
  }
  assert.ok(finished, "Image import completed");
  await b.eval(
    `document.querySelector('.gallery,.prize-gallery')?.scrollIntoView({block:'center'})`,
  );
  // Wait for actual decoding rather than assuming a fixed paint delay is enough.
  let decoded = false;
  for (let i = 0; i < 100; i++) {
    decoded = await b.eval(
      `(()=>{const images=[...document.querySelectorAll('.gallery img,.prize-gallery img')];return images.length>=${path.length}&&images.every(i=>i.naturalWidth>0);})()`,
    );
    if (decoded) break;
    await delay(100);
  }
  assert.ok(decoded, "Uploaded gallery images decoded");
}
async function shot(name) {
  await b.shot(`${out}/${name}.png`);
}
await b.call("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});
await b.call("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: out,
});
await b.call("Page.navigate", { url: "about:blank" });
await b.call("Storage.clearDataForOrigin", {
  origin: new URL(APP_URL).origin,
  storageTypes: "all",
});
await b.call("Page.navigate", { url: APP_URL });
for (let i = 0; i < 100; i++) {
  if (await b.eval(`document.documentElement?.dataset.appReady==='true'`))
    break;
  await delay(100);
}
check(
  "App ready",
  await b.eval(`document.documentElement.dataset.appReady==='true'`),
);
const deadline = Date.now() + 864000000;
await b.eval(
  `localStorage.setItem('torah-ore-settings-v1',JSON.stringify({deadline:${deadline},duration:5,fade:1,photoTransition:'veil',adaptiveLight:true}));location.reload()`,
);
await delay(900);
await tab("Photos");
await upload(".admin input[type=file][multiple]", [
  join(out, "torah-fixture-a.png"),
  join(out, "torah-fixture-b.png"),
]);
check(
  "Both photo thumbnails decoded",
  await b.eval(
    `document.querySelectorAll('.photo-row').length===2&&[...document.querySelectorAll('.photo-row>img')].every(i=>i.naturalWidth>0)`,
  ),
);
await key("p", "KeyP", 1);
const retainedSource = await b.eval(
  `document.querySelector('.photo-native-image')?.src`,
);
await b.eval(
  `[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Frame photo').click()`,
);
await delay(200);
await clickText("Phone / portrait");
await b.eval(
  `document.querySelector('.focal-picker').scrollIntoView({block:'center'})`,
);
await delay(200);
const rect = await b.eval(
  `(()=>{const r=document.querySelector('.focal-picker').getBoundingClientRect();return {x:r.left+r.width*.8,y:r.top+r.height*.3};})()`,
);
await b.call("Input.dispatchMouseEvent", {
  type: "mousePressed",
  x: rect.x,
  y: rect.y,
  button: "left",
  clickCount: 1,
});
await b.call("Input.dispatchMouseEvent", {
  type: "mouseReleased",
  x: rect.x,
  y: rect.y,
  button: "left",
  clickCount: 1,
});
await shot("focal-editor");
await clickText("Save framing");
await delay(450);
check(
  "Photo framing saved in IndexedDB",
  await b.eval(
    `(async()=>{const r=indexedDB.open('torah-ore-media');const db=await new Promise(res=>r.onsuccess=()=>res(r.result));const q=db.transaction('photos').objectStore('photos').getAll();const rows=await new Promise(res=>q.onsuccess=()=>res(q.result));db.close();return rows.some(p=>Math.abs(p.portraitX-.8)<.03&&Math.abs(p.portraitY-.3)<.03&&p.analysis);})()`,
  ),
);
check(
  "Framing edits reuse the displayed photo source",
  await b.eval(
    `document.querySelector('.photo-native-image')?.src===${JSON.stringify(retainedSource)}`,
  ),
);
// Change order while paused: the current native image must not restart.
await b.eval(
  `(()=>{const select=[...document.querySelectorAll('.admin label')].find(e=>e.querySelector('span')?.textContent==='Photo order').querySelector('select');select.value='shuffle';select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
);
await delay(300);
check(
  "Shuffle preference saves without replacing the current photo",
  await b.eval(
    `JSON.parse(localStorage.getItem('torah-ore-settings-v1')).photoOrder==='shuffle'&&document.querySelector('.photo-native-image').src===${JSON.stringify(retainedSource)}`,
  ),
);
await tab("Appearance");
await b.eval(
  `document.querySelector('input[name="display-theme"][value="emerald-white"]').click()`,
);
await delay(400);
check(
  "Emerald & White keeps green and gold with white countdown digits",
  await b.eval(
    `(()=>{const s=JSON.parse(localStorage.getItem('torah-ore-settings-v1')),style=getComputedStyle(document.querySelector('.display'));return s.theme==='emerald-white'&&s.digitColor==='#ffffff'&&s.backgroundColor==='#050b08'&&s.lightColor==='#f2d99c'&&style.getPropertyValue('--digit-color').trim()==='#ffffff';})()`,
  ),
);
await key("p", "KeyP", 1);
await tab("Control");
check(
  "Control contains photo and health status",
  await b.eval(
    `document.querySelector('.operator-grid').textContent.includes('torah-fixture')&&document.querySelector('.admin-content').textContent.includes('BROWSER PERFORMANCE')`,
  ),
);
await key("F2", "F2");
await delay(1400);
await shot("countdown-1080");
check(
  "Countdown and photograph visible",
  await b.eval(
    `!!document.querySelector('.countdown-stage')&&[...document.querySelectorAll('.photo-slide')].some(s=>{const i=s.querySelector('img'),c=s.querySelector('canvas');return i?.naturalWidth>0&&(getComputedStyle(i).visibility==='visible'||(c?.width>0&&getComputedStyle(c).visibility==='visible'));})`,
  ),
);
const campaignBeforePrize = await b.eval(
  `(()=>{const r=document.querySelector('.clock-section').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`,
);
await tab("Prizes");
await upload(".admin input[type=file][multiple]", [
  join(out, "torah-fixture-prize.png"),
]);
// Slow software-rendered 4K screenshots can outlast a twenty-second reveal.
// Keep the prize visible throughout viewport checks without changing its clock.
await b.eval(
  `(()=>{const s=document.querySelector('.prize-editor select');s.value='7200';s.dispatchEvent(new Event('change',{bubbles:true}));})()`,
);
await delay(150);
await clickText("Save prize");
await delay(250);
await clickText("Prepare as next prize");
check(
  "Next prize prepared separately",
  await b.eval(
    `JSON.parse(localStorage.getItem('torah-ore-prepared-prize-v1')).seconds===300&&!localStorage.getItem('torah-ore-prize-run-v1')`,
  ),
);
await clickText("Test in 10 seconds");
await delay(350);
check(
  "Prize countdown stays secondary to the main clock",
  await b.eval(
    `!!document.querySelector('.prize-clock')&&!!document.querySelector('.countdown-stage')&&document.querySelector('.display').classList.contains('has-prize')`,
  ),
);
check(
  "Starting a prize never moves or shrinks the campaign clock",
  await b.eval(
    `(()=>{const r=document.querySelector('.clock-section').getBoundingClientRect(),before=${JSON.stringify(campaignBeforePrize)};return Object.keys(before).every(k=>Math.abs(r[k]-before[k])<1);})()`,
  ),
);
const prizeEnd = await b.eval(
  `JSON.parse(localStorage.getItem('torah-ore-prize-run-v1')).endAt`,
);
await tab("Prizes");
await clickText("Prepare as next prize");
check(
  "Preparing leaves active deadline unchanged",
  await b.eval(
    `JSON.parse(localStorage.getItem('torah-ore-prize-run-v1')).endAt===${prizeEnd}`,
  ),
);
await key("F2", "F2");
await delay(Math.max(100, prizeEnd - Date.now() + 1200));
await shot("prize-reveal");
check(
  "Prize picture reveals at the end",
  await b.eval(
    `!!document.querySelector('.prize-unveiled img')&&document.querySelector('.prize-unveiled img').naturalWidth>0`,
  ),
);
check(
  "Transparent prize source retains clear corners and an opaque subject after import",
  await b.eval(
    `(async()=>{const image=document.querySelector('.prize-unveiled img');await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const g=c.getContext('2d');g.drawImage(image,0,0);return g.getImageData(0,0,1,1).data[3]===0&&g.getImageData(400,500,1,1).data[3]===255;})()`,
  ),
);
check(
  "Prize presentation has no rectangular fill, border, shadow or reveal crop",
  await b.eval(
    `['.prize-display','.prize-unveiled','.prize-picture-window','.prize-picture-window img'].every(q=>{const s=getComputedStyle(document.querySelector(q));return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage==='none'&&parseFloat(s.borderTopWidth)===0&&s.boxShadow==='none'&&s.clipPath==='none';})`,
  ),
);
for (const [name, width, height] of [
  ["1080", 1920, 1080],
  ["4k", 3840, 2160],
  ["phone", 390, 844],
]) {
  await b.call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: name === "phone",
  });
  await delay(1400);
  await shot("transparent-prize-" + name);
  check(
    `${name} prize stays compact, contained and below the campaign clock`,
    await b.eval(
      `(()=>{const r=document.querySelector('.prize-picture-window').getBoundingClientRect(),n=document.querySelector('.clock-section').getBoundingClientRect();return r.width<=innerWidth*.3&&r.height>=innerHeight*.05&&r.height<=innerHeight*.15&&r.left>=0&&r.right<=innerWidth+1&&r.bottom<innerHeight&&n.bottom<r.top&&getComputedStyle(document.querySelector('.prize-picture-window img')).objectFit==='contain';})()`,
    ),
  );
}
await b.call("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});
await key("h", "KeyH", 1);
await delay(800);
check(
  "Alt+H hides prize",
  await b.eval(`!document.querySelector('.prize-display')`),
);
await key("o", "KeyO", 1);
await key("p", "KeyP", 1);
check(
  "Alt+P pauses cycling",
  await b.eval(
    `document.querySelector('.operator-grid').textContent.includes('Paused')`,
  ),
);
const before = await b.eval(
  `document.querySelectorAll('.operator-grid article')[2].querySelector('strong').textContent`,
);
await key("ArrowRight", "ArrowRight", 1);
await delay(1300);
check(
  "Manual next photo works while paused",
  (await b.eval(
    `document.querySelectorAll('.operator-grid article')[2].querySelector('strong').textContent`,
  )) !== before,
);
await key("p", "KeyP", 1);
await b.eval(
  `document.querySelector('.settings-advanced')?.querySelector('summary')?.click()`,
);
await delay(180);
await clickText("Download health report");
await delay(300);
check(
  "Health report downloads",
  (await readdir(out)).some((n) => n.endsWith(".json")),
);
await key("F2", "F2");
await tab("Control");
const fullRect = await b.eval(
  `(()=>{const r=document.querySelector('.admin footer button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
);
await b.call("Input.dispatchMouseEvent", {
  type: "mousePressed",
  x: fullRect.x,
  y: fullRect.y,
  button: "left",
  clickCount: 1,
});
await b.call("Input.dispatchMouseEvent", {
  type: "mouseReleased",
  x: fullRect.x,
  y: fullRect.y,
  button: "left",
  clickCount: 1,
});
await delay(400);
if (await b.eval(`!!document.fullscreenElement`)) {
  check("Fullscreen entry", true);
  await b.eval(`document.exitFullscreen()`);
  await delay(250);
  check("Fullscreen exit", await b.eval(`!document.fullscreenElement`));
} else {
  limitations.push(
    "Fullscreen entry/exit did not complete in headless Chrome; verify on the event laptop.",
  );
  console.log("UNVERIFIED fullscreen entry/exit");
  if (await b.eval(`!!document.querySelector('.admin')`)) await key("F2", "F2");
}
for (const [name, width, height] of [
  ["4k", 3840, 2160],
  ["phone", 390, 844],
]) {
  await b.call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: name === "phone",
  });
  await delay(1800);
  await shot("countdown-" + name);
  check(
    `${name} countdown bounds`,
    await b.eval(
      `(()=>{const r=document.querySelector('.countdown-stage').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.positioned-unit .number')].every(n=>{const a=n.getBoundingClientRect();return a.left>=-1&&a.right<=innerWidth+1&&a.top>=-1&&a.bottom<=innerHeight+1;});})()`,
    ),
  );
}
await b.call("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});
await tab("Control");
await clickText("Run full rehearsal");
const rehearsalStart = Date.now();
console.log("RUNNING 40-second rehearsal");
await delay(21800);
const numberBefore = await b.eval(
  `(()=>{const r=document.querySelector('.countdown-stage .number').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`,
);
await delay(Math.max(0, rehearsalStart + 23200 - Date.now()));
const numberZero = await b.eval(
  `(()=>{const r=document.querySelector('.countdown-stage .number').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`,
);
check(
  "Zero remains anchored",
  Math.abs(numberBefore.x - numberZero.x) < 2 &&
    Math.abs(numberBefore.y - numberZero.y) < 2,
);
await shot("zero");
await delay(2400);
await shot("launch");
await delay(Math.max(0, rehearsalStart + 40700 - Date.now()));
check(
  "Rehearsal restores the real countdown",
  await b.eval(
    `!!document.querySelector('.countdown-stage')&&!document.querySelector('.cinematic-finale')&&JSON.parse(localStorage.getItem('torah-ore-settings-v1')).deadline===${deadline}`,
  ),
);
await b.call("Page.reload");
await delay(1200);
await tab("Control");
check(
  "Gallery and prepared prize recover after refresh",
  await b.eval(
    `document.querySelector('.operator-grid').textContent.includes('torah-fixture')&&JSON.parse(localStorage.getItem('torah-ore-prepared-prize-v1')).seconds===300`,
  ),
);
check(
  "Shuffle and white-number theme survive refresh",
  await b.eval(
    `(()=>{const s=JSON.parse(localStorage.getItem('torah-ore-settings-v1'));return s.photoOrder==='shuffle'&&s.theme==='emerald-white'&&getComputedStyle(document.querySelector('.display')).getPropertyValue('--digit-color').trim()==='#ffffff';})()`,
  ),
);
await key("r", "KeyR", 1);
await delay(500);
check(
  "Alt+R starts the prepared prize",
  await b.eval(
    `!!document.querySelector('.prize-clock')&&JSON.parse(localStorage.getItem('torah-ore-prize-run-v1')).prizeId===JSON.parse(localStorage.getItem('torah-ore-prepared-prize-v1')).prizeId`,
  ),
);
check(
  "Prepared start preserves the campaign deadline",
  await b.eval(
    `JSON.parse(localStorage.getItem('torah-ore-settings-v1')).deadline===${deadline}`,
  ),
);
await key("h", "KeyH", 1);
await b.call("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
for (let i = 0; i < 50; i++) {
  if (
    await b.eval(
      `document.querySelector('.display').classList.contains('reduced')`,
    )
  )
    break;
  await delay(100);
}
check(
  "Reduced-motion preference activates",
  await b.eval(
    `document.querySelector('.display').classList.contains('reduced')`,
  ),
);
if (await b.eval(`!!document.querySelector('.admin')`)) await key("F2", "F2");
await key("ArrowRight", "ArrowRight", 1);
await delay(700);
check(
  "Reduced motion freezes photo zoom",
  await b.eval(
    `[...document.querySelectorAll('.photo-slide img')].every(i=>i.getAnimations().length===0)`,
  ),
);
await b.call("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await delay(900);
check(
  "Native image uses the saved portrait focal variables",
  await b.eval(
    `document.querySelectorAll('.photo-slide').length>0&&[...document.querySelectorAll('.photo-slide')].every(s=>{const actual=getComputedStyle(s.querySelector('img')).objectPosition.split(' ').map(parseFloat),expected=[getComputedStyle(s).getPropertyValue('--portrait-photo-x'),getComputedStyle(s).getPropertyValue('--portrait-photo-y')].map(parseFloat);return actual.every((v,i)=>Math.abs(v-expected[i])<.001);})`,
  ),
);
await b.call("Emulation.setEmulatedMedia", { features: [] });
const sw = await b.eval(
  `navigator.serviceWorker.getRegistration().then(r=>!!r?.active)`,
);
if (sw) {
  await b.call("Network.enable");
  await b.call("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await b.call("Page.reload");
  await delay(1700);
  check(
    "Cached production app restores offline",
    await b.eval(
      `document.documentElement.dataset.appReady==='true'&&!!document.querySelector('.countdown-stage')`,
    ),
  );
  check(
    "Offline gallery persists",
    await b.eval(
      `!!document.querySelector('.photo-slide img')&&JSON.parse(localStorage.getItem('torah-ore-settings-v1')).deadline===${deadline}`,
    ),
  );
  await b.call("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
} else
  limitations.push(
    "No active service worker; cached web build offline check unavailable.",
  );

check("No runtime exceptions", b.errors.length === 0);
await writeFile(
  `${out}/smoke-results.json`,
  JSON.stringify({ results, limitations, errors: b.errors }, null, 2),
);
console.log("DONE", results.length, "checks", out);
b.close();
