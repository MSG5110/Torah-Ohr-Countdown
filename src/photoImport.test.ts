import { afterEach, describe, it, expect, vi } from "vitest";
import { preparePhoto } from "./storage";
afterEach(() => vi.unstubAllGlobals());
describe("single-decode photo imports", () => {
  it("creates the full photo, thumbnail and analysis from one bitmap", async () => {
    const close = vi.fn(),
      decode = vi.fn(async () => ({ width: 8000, height: 4000, close }));
    vi.stubGlobal("createImageBitmap", decode);
    const canvases: { width: number; height: number }[] = [];
    vi.stubGlobal("document", {
      createElement: () => {
        const c = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({
              data: new Uint8ClampedArray([255, 255, 255, 255]),
            }),
          }),
          toBlob: (cb: (b: Blob) => void) =>
            cb(new Blob(["encoded"], { type: "image/webp" })),
        };
        canvases.push(c);
        return c;
      },
    });
    const result = await preparePhoto(
      new File(["source"], "photo.png", { type: "image/png" }),
    );
    expect(decode).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(canvases.map((c) => [c.width, c.height])).toEqual([
      [4096, 2048],
      [64, 36],
      [320, 160],
    ]);
    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.analysis?.brightness).toBeCloseTo(1);
  });
  it("keeps the photo usable if optional thumbnail or analysis contexts are unavailable", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({
      width: 2000,
      height: 1000,
      close: vi.fn(),
    }));
    let count = 0;
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => (++count === 1 ? { drawImage: vi.fn() } : null),
        toBlob: (cb: (b: Blob) => void) => cb(new Blob(["photo"])),
      }),
    });
    const r = await preparePhoto(
      new File(["source"], "photo.jpg", { type: "image/jpeg" }),
    );
    expect(r.blob).toBeInstanceOf(Blob);
    expect(r.thumbnail).toBeUndefined();
    expect(r.analysis).toBeUndefined();
  });
});

describe("import recovery", () => {
  it("preserves decoded source pixels if canvas encoding fails", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({width:1200,height:800,close:vi.fn()}));
    vi.stubGlobal("document", {createElement:()=>({width:0,height:0,getContext:()=>({drawImage:vi.fn(),getImageData:()=>({data:new Uint8ClampedArray(4)})}),toBlob:(cb:(blob:Blob|null)=>void)=>cb(null)})});
    const file = new File(["original bytes"], "Photo.JPG", {type:"application/octet-stream"});
    const result=await preparePhoto(file);
    expect(await result.blob.text()).toBe('original bytes');expect(result.blob.type).toBe('image/jpeg');expect(result.thumbnail).toBeUndefined();
  });
  it("aborts hung decode tasks and releases late bitmaps",async()=>{
    const {photoTask}=await import('./storage');let resolve!:(value:{close:()=>void})=>void;const task=new Promise<{close:()=>void}>(r=>{resolve=r});const close=vi.fn(),controller=new AbortController();const result=photoTask(task,controller.signal,'Decode',10000,b=>b.close());controller.abort();await expect(result).rejects.toMatchObject({name:'AbortError'});resolve({close});await Promise.resolve();expect(close).toHaveBeenCalledOnce();
  });
  it("times out hung image work instead of leaving upload controls locked",async()=>{
    vi.useFakeTimers();try {const {photoTask}=await import('./storage');const result=photoTask(new Promise(()=>{}),undefined,'Photo decoding',100);const rejection=expect(result).rejects.toThrow('took too long');await vi.advanceTimersByTimeAsync(101);await rejection;}finally{vi.useRealTimers();}
  });
});
