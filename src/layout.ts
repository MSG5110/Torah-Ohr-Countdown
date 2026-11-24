export type LayoutUnit = { id: string; value: number };
export function countdownLayout(
  list: LayoutUnit[],
  width: number,
  height: number,
  scale = 1,
) {
  const grid = width < 600 && height > width * 0.85 && list.length === 4;
  const labels = Math.max(24, Math.min(46, width * 0.025));
  const rows = grid ? 2 : 1;
  const gap = grid ? width * 0.08 : 0;
  const digits = list.map((u) => String(u.value).padStart(2, "0").length);
  // The bundled Barlow Condensed tabular glyphs advance by 520/1000 em.
  const glyph = 0.52;
  const size = grid
    ? Math.min(
        (width - gap) / (Math.max(...digits) * glyph * 2 + 0.5),
        (height / 2 - labels - 16) / 1.04,
      ) * Math.min(scale, 1 / 0.94)
    : Math.min(
        width /
          (digits.reduce((a, n) => a + n, 0) * glyph +
            (list.length - 1) * 0.31 +
            0.3),
        (height * (1 - (list.length - 1) * 0.1) - labels - 12) / 1.04,
      ) * Math.min(scale, 1 / 0.94);
  const font = Math.max(12, size * 0.94);
  const groupW = grid
    ? width
    : font *
      (digits.reduce((a, n) => a + n, 0) * glyph + (list.length - 1) * 0.31);
  const top = Math.max(
    0,
    (height - (font * 1.04 + labels) * rows - (grid ? 20 : 0)) / 2,
  );
  let cursor = (width - groupW) / 2;
  return list.map((u, i) => {
    const unitWidth = digits[i] * glyph * font;
    let x,
      y = top;
    if (grid) {
      x = width * (i % 2 ? 0.75 : 0.25) - unitWidth / 2;
      y += Math.floor(i / 2) * (font * 1.04 + labels + 20);
    } else {
      x = cursor;
      cursor += unitWidth + font * 0.31;
    }
    return {
      ...u,
      x,
      y,
      font,
      width: unitWidth,
      colonX: x - font * 0.155,
      colon: !grid && i > 0,
    };
  });
}
