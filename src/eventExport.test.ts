import { afterEach, describe, it, expect, vi } from "vitest";
import { makeEventPackage } from "./eventExport";
import { defaults } from "./engine";
afterEach(() => vi.unstubAllGlobals());
describe("complete event snapshots", () => {
  it("packs independent prize options, source bytes, logo and real clocks", async () => {
    vi.stubGlobal("document", { querySelector: () => null });
    class Reader {
      result = "";
      onload = () => {};
      onerror = () => {};
      readAsDataURL(blob: Blob) {
        void blob.arrayBuffer().then((bytes) => {
          this.result = `data:${blob.type};base64,${btoa(String.fromCharCode(...new Uint8Array(bytes)))}`;
          this.onload();
        });
      }
    }
    vi.stubGlobal("FileReader", Reader);
    const photo = {
      id: "photo",
      name: "Photo",
      order: 0,
      blob: new Blob([new Uint8Array([0, 1, 2, 255])], { type: "image/png" }),
      portraitX: 0.7,
    };
    const prize = {
      ...photo,
      id: "prize",
      countdownSeconds: 193,
      revealSeconds: 7200,
      revealText: "Win this!",
    };
    const run = {
      prizeId: "prize",
      name: "Prize",
      startedAt: 1000,
      endAt: 2000,
      revealSeconds: 7200,
      revealText: "Win this!",
      pausedAt: 1500,
    };
    const prepared = {
      prizeId: "prize",
      seconds: 193,
      revealSeconds: 7200,
      revealText: "Win this!",
    };
    const progress = vi.fn();
    const p = await makeEventPackage(
      {
        settings: {
          ...defaults,
          deadline: 1799999999999,
          logo: "data:image/png;base64,original",
        },
        photos: [photo],
        prizes: [prize],
        run,
        prepared,
      },
      progress,
    );
    expect(p.photos[0].data).toBe("data:image/png;base64,AAEC/w==");
    expect(p.photos[0].portraitX).toBe(0.7);
    expect(p.prizes[0]).toMatchObject({
      countdownSeconds: 193,
      revealSeconds: 7200,
      revealText: "Win this!",
    });
    expect(p.settings.deadline).toBe(1799999999999);
    expect(p.settings.logo).toBe("data:image/png;base64,original");
    expect(p.run).toEqual(run);
    expect(p.prepared).toEqual(prepared);
    expect(p.run).not.toBe(run);
    expect(progress).toHaveBeenCalledTimes(2);
  });
});

describe("original logo inclusion", () => {
  it("embeds a filesystem or hosted logo without changing its image bytes", async () => {
    vi.stubGlobal("document", { querySelector: () => null });
    class Reader {
      result = "";
      onload = () => {};
      onerror = () => {};
      readAsDataURL(blob: Blob) {
        void blob.arrayBuffer().then((bytes) => {
          this.result = `data:${blob.type};base64,${btoa(String.fromCharCode(...new Uint8Array(bytes)))}`;
          this.onload();
        });
      }
    }
    vi.stubGlobal("FileReader", Reader);
    const fetchLogo = vi.fn(
      async () => new Response(new Blob(["ORIGINAL"], { type: "image/png" })),
    );
    vi.stubGlobal("fetch", fetchLogo);
    const p = await makeEventPackage({
      settings: { ...defaults, logo: "/assets/original.png" },
      photos: [],
      prizes: [],
      run: null,
      prepared: null,
    });
    expect(fetchLogo).toHaveBeenCalledWith("/assets/original.png");
    expect(p.settings.logo).toBe("data:image/png;base64,T1JJR0lOQUw=");
  });
});

describe("low-memory standalone assembly", () => {
  it("inserts escaped package data without constructing another document", async () => {
    const {embedEventPackage}=await import('./eventExport');
    vi.stubGlobal('DOMParser',class {constructor(){throw Error('Must not parse the whole app')}});
    const pack={version:1 as const,id:'test',exportedAt:'now',settings:{...defaults,launchText:'</script><h1>שלום</h1>'},photos:[],prizes:[],run:null,prepared:null};
    const result=embedEventPackage('<!doctype html><html lang="en" data-standalone="true" data-app-ready="true"><head><style>body{background:#050b08}</style></head><body>APP</body></html>',pack);
    expect(result).not.toContain('data-app-ready');expect(result).toContain('data-standalone="true"');
    const raw=result.match(/type="application\/json">([\s\S]*?)<\/script>/)![1];expect(JSON.parse(raw)).toEqual(pack);expect(raw).not.toContain('</script>');expect(result).toContain('<body>APP</body>');
  });
  it("rejects a non-standalone file instead of preparing a broken export",async()=>{
    const {embedEventPackage}=await import('./eventExport');expect(()=>embedEventPackage('<html><head></head></html>',{} as never)).toThrow('standalone');
  });
});
