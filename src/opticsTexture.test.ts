import { afterEach, describe, expect, it, vi } from "vitest";
import { bloomTexture, flareTexture, glintTexture } from "./optics";
import { themes } from "./themes";
import { mix, rgb, rgba, validColor } from "./colors";
afterEach(() => vi.unstubAllGlobals());
describe("canvas color regression", () => {
  it("can use a mixed highlight as an alpha-gradient stop", () => {
    const highlight = mix("#f2d99c", "#ffffff", 0.25);
    expect(validColor(highlight)).toBe(true);
    expect(rgb(highlight)).toEqual([245, 227, 181]);
    expect(rgba(highlight, 0.6)).toBe("rgba(245,227,181,0.6)");
  });
  it.each(themes)(
    "builds every optical texture without invalid colors in $name",
    (theme) => {
      let stops = 0;
      const gradient = {
        addColorStop(_offset: number, color: string) {
          // Reject the exact NaN stop that Chrome reported, along with invalid ranges.
          if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(color)) {
            stops++;
            return;
          }
          const m = /^rgba?\(([^)]+)\)$/.exec(color);
          if (!m) throw new Error(`Invalid Canvas color: ${color}`);
          const channels = m[1].split(",").map(Number);
          if (
            channels.length < 3 ||
            channels.length > 4 ||
            channels.some((n) => !Number.isFinite(n)) ||
            channels.slice(0, 3).some((n) => n < 0 || n > 255) ||
            (channels.length === 4 && (channels[3] < 0 || channels[3] > 1))
          )
            throw new Error(`Invalid Canvas color: ${color}`);
          stops++;
        },
      };
      const g = {
        createRadialGradient: () => gradient,
        fillRect() {},
        save() {},
        restore() {},
        translate() {},
        scale() {},
        rotate() {},
        drawImage() {},
        fillStyle: "",
      };
      vi.stubGlobal("document", {
        createElement: () => ({ width: 0, height: 0, getContext: () => g }),
      });
      expect(() => {
        bloomTexture(theme.palette.lightColor);
        flareTexture(theme.palette.lightColor);
        glintTexture(theme.palette.particleColor, 0);
        glintTexture(theme.palette.particleColor, 1);
      }).not.toThrow();
      expect(stops).toBeGreaterThan(40);
    },
  );
});
