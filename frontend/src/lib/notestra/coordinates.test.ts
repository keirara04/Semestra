import { describe, expect, it } from "vitest";
import { pointToNormalized, pointToPixels, toNormalized, toPixels } from "./coordinates";

describe("coordinates", () => {
  it("round-trips px -> normalized -> px", () => {
    const px = 126;
    const pageWidth = 600;
    expect(toPixels(toNormalized(px, pageWidth), pageWidth)).toBeCloseTo(px);
  });

  it("normalized values stay stable across a viewport/zoom change", () => {
    const normalized = toNormalized(300, 600); // 0.5
    expect(toPixels(normalized, 1200)).toBeCloseTo(600); // same relative position at 2x zoom
  });

  it("converts a drawing point pair", () => {
    const [nx, ny] = pointToNormalized([120, 340], 600, 800);
    expect(nx).toBeCloseTo(0.2);
    expect(ny).toBeCloseTo(0.425);

    const [px, py] = pointToPixels([nx, ny], 600, 800);
    expect(px).toBeCloseTo(120);
    expect(py).toBeCloseTo(340);
  });
});
