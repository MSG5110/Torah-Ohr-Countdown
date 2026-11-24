type DisplayDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type DisplayRoot = HTMLElement & { webkitRequestFullscreen?: () => void };
export function displayIsFullscreen(doc: Document = document) {
  return !!(doc.fullscreenElement || (doc as DisplayDocument).webkitFullscreenElement);
}
function changeDisplay(doc: Document, run: () => void | Promise<void>, entered: boolean) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const changed = () => { if (displayIsFullscreen(doc) === entered) finish(); };
    const failed = () => finish(new Error("The browser blocked full screen."));
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const event of ["fullscreenchange", "webkitfullscreenchange"]) doc.removeEventListener(event, changed);
      for (const event of ["fullscreenerror", "webkitfullscreenerror"]) doc.removeEventListener(event, failed);
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => {
      if (displayIsFullscreen(doc) === entered) finish(); else failed();
    }, 5000);
    for (const event of ["fullscreenchange", "webkitfullscreenchange"]) doc.addEventListener(event, changed);
    for (const event of ["fullscreenerror", "webkitfullscreenerror"]) doc.addEventListener(event, failed);
    try {
      const task = run();
      if (task && typeof task.then === "function") task.then(changed, finish);
      changed();
    } catch (error) { finish(error); }
  });
}
// Called directly from the click handler, before any async work consumes the
// browser's user activation. The entire document includes every display layer.
export async function toggleDisplayFullscreen(doc: Document = document) {
  const legacy = doc as DisplayDocument, root = doc.documentElement as DisplayRoot;
  if (displayIsFullscreen(doc)) {
    if (typeof doc.exitFullscreen === "function") await changeDisplay(doc, () => doc.exitFullscreen(), false);
    else if (typeof legacy.webkitExitFullscreen === "function")
      await changeDisplay(doc, () => legacy.webkitExitFullscreen!(), false);
    else throw new Error("This browser cannot exit full screen automatically.");
    return "exited" as const;
  }
  if (typeof root.requestFullscreen === "function")
    await changeDisplay(doc, () => root.requestFullscreen({ navigationUI: "hide" }), true);
  else if (typeof root.webkitRequestFullscreen === "function")
    await changeDisplay(doc, () => root.webkitRequestFullscreen!(), true);
  else throw new Error("Full screen is not supported by this browser.");
  return "entered" as const;
}
export function fullscreenHelp(agent: string = navigator.userAgent) {
  if (/iPhone|iPad|iPod/i.test(agent))
    return "This browser cannot open full screen. Use Add to Home Screen from the browser menu when available.";
  const shortcut = /Macintosh|Mac OS X/i.test(agent) ? "Control + Command + F" : "F11 (or Fn + F11)";
  return `Full screen was blocked or is unavailable. Open the HTML directly in Chrome or Edge, or press ${shortcut}.`;
}
