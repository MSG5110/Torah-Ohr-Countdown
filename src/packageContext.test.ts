import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { defaults } from "./engine";
let context: typeof import("./packageContext");
const row = {
  id: "a",
  name: "Learning",
  order: 0,
  data: "data:image/webp;base64,aW1hZ2U=",
  portraitX: 0.8,
  portraitY: 0.3,
};
function sample() {
  return {
    version: 1,
    id: "event-123",
    exportedAt: new Date().toISOString(),
    settings: { ...defaults, deadline: 1799999999999 },
    photos: [row],
    prizes: [
      {
        ...row,
        id: "prize",
        countdownSeconds: 123,
        revealSeconds: 7200,
        revealText: "A prize\nפרס",
      },
    ],
    run: {
      prizeId: "prize",
      name: "Prize",
      startedAt: 1000,
      endAt: 2000,
      revealSeconds: 7200,
      revealText: "Caption",
      pausedAt: 1500,
    },
    prepared: {
      prizeId: "prize",
      seconds: 123,
      revealSeconds: 7200,
      revealText: "Next",
    },
  };
}
beforeEach(async () => {
  vi.resetModules();
  context = await import("./packageContext");
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("portable event restoration", () => {
  it("keeps ordinary installations on their original keys", () => {
    expect(context.storageName("torah-ore-media")).toBe("torah-ore-media");
    expect(context.hasPackage()).toBe(false);
  });
  it("restores original image bytes, framing, prizes and absolute deadlines", async () => {
    const data = sample();
    await context.initializePackage(JSON.stringify(data));
    expect(context.embeddedPhotos()[0].portraitX).toBe(0.8);
    expect(await context.embeddedPhotos()[0].blob.text()).toBe("image");
    expect(context.embeddedPrizes()[0]).toMatchObject({
      countdownSeconds: 123,
      revealSeconds: 7200,
      revealText: "A prize\nפרס",
    });
    expect(
      JSON.parse(context.appStorage.getItem("torah-ore-settings-v1")!).deadline,
    ).toBe(data.settings.deadline);
    expect(
      JSON.parse(context.appStorage.getItem("torah-ore-prize-run-v1")!),
    ).toEqual(data.run);
    expect(
      JSON.parse(context.appStorage.getItem("torah-ore-prepared-prize-v1")!),
    ).toEqual(data.prepared);
  });
  it("isolates exports from existing settings and galleries", async () => {
    localStorage.setItem("torah-ore-settings-v1", '{"deadline":42}');
    await context.initializePackage(JSON.stringify(sample()));
    expect(context.storageName("torah-ore-media")).toBe(
      "torah-ore-media-event-123",
    );
    context.appStorage.setItem("torah-ore-settings-v1", '{"deadline":99}');
    expect(localStorage.getItem("torah-ore-settings-v1")).toBe(
      '{"deadline":42}',
    );
    expect(context.appStorage.getItem("torah-ore-settings-v1")).toBe(
      '{"deadline":99}',
    );
  });
  it("does not restart a stopped bundled prize after reopening", async () => {
    await context.initializePackage(JSON.stringify(sample()));
    context.appStorage.removeItem("torah-ore-prize-run-v1");
    context.appStorage.removeItem("torah-ore-prepared-prize-v1");
    vi.resetModules();
    context = await import("./packageContext");
    await context.initializePackage(JSON.stringify(sample()));
    expect(context.appStorage.getItem("torah-ore-prize-run-v1")).toBeNull();
    expect(localStorage.getItem("torah-ore-prize-run-v1-event-123")).toBe(
      "__torah_explicitly_cleared__",
    );
  });
  it("works from embedded media and settings when browser storage is blocked", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    });
    await context.initializePackage(JSON.stringify(sample()));
    expect(context.appStorage.getItem("torah-ore-settings-v1")).toContain(
      "1799999999999",
    );
    expect(context.embeddedPhotos()).toHaveLength(1);
    expect(() =>
      context.appStorage.setItem("torah-ore-settings-v1", "changed"),
    ).toThrow("blocked");
    expect(context.appStorage.getItem("torah-ore-settings-v1")).toBe("changed");
  });
  it("safely embeds captions containing HTML and script endings", () => {
    const value = { caption: "</script><script>alert(1)</script>\u2028פרס" };
    const json = context.jsonForHTML(value);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(value);
  });
  it.each([
    { version: 2 },
    { id: "../../another" },
    { photos: [{ ...row, data: "https://example.com/photo" }] },
    { photos: [{ ...row, data: undefined }] },
    { prizes: [{ ...row, order: NaN }] },
  ])("rejects corrupt or linked data: %j", (patch) => {
    expect(() =>
      context.parseEventPackage(JSON.stringify({ ...sample(), ...patch })),
    ).toThrow();
  });
});
