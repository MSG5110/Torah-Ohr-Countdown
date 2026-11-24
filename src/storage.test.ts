import { afterEach, describe, it, expect, vi } from "vitest";
import { optimize } from "./storage";
afterEach(() => vi.unstubAllGlobals());
describe("photo import and compatibility", () => {
  it("rejects unsupported and oversized files with helpful feedback", async () => {
    await expect(
      optimize(new File(["bad"], "document.txt", { type: "text/plain" })),
    ).rejects.toThrow("JPG, PNG or WebP");
    await expect(
      optimize({
        name: "large.jpg",
        type: "image/jpeg",
        size: 61 * 1024 * 1024,
      } as File),
    ).rejects.toThrow("60 MB");
  });
  it("accepts phone JPEGs without MIME metadata and keeps a little zoom headroom above UHD", async () => {
    const close = vi.fn(),
      draw = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: draw }),
      toBlob: (cb: (b: Blob) => void) =>
        cb(new Blob(["optimized"], { type: "image/webp" })),
    };
    vi.stubGlobal("createImageBitmap", async () => ({
      width: 8000,
      height: 4000,
      close,
    }));
    vi.stubGlobal("document", { createElement: () => canvas });
    const result = await optimize(new File(["pixels"], "photo.JPG"));
    expect(canvas.width).toBe(4096);
    expect(canvas.height).toBe(2048);
    expect(result.type).toBe("image/webp");
    expect(close).toHaveBeenCalledOnce();
    expect(draw).toHaveBeenCalledOnce();
  });
  it("falls back to the browser image decoder when bitmap decoding is unavailable", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    class ImageMock {
      width = 2000;
      height = 1200;
      src = "";
      decode() {
        return Promise.resolve();
      }
    }
    vi.stubGlobal("Image", ImageMock);
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (cb: (b: Blob) => void) =>
        cb(new Blob(["photo"], { type: "image/png" })),
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    const result = await optimize(
      new File(["pixels"], "photo.png", { type: "image/png" }),
    );
    expect(result.type).toBe("image/png");
    expect(canvas.width).toBe(2000);
  });
});
