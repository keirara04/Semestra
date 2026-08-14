// Normalized (0-1) coordinate conversion, see
// mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 6. Annotation data is always
// persisted normalized to the page's own dimensions; conversion to/from
// screen pixels happens only at capture time and render time, so zoom and
// viewport size never affect stored data.

export function toNormalized(px: number, pageDimension: number): number {
  return pageDimension === 0 ? 0 : px / pageDimension;
}

export function toPixels(normalized: number, pageDimension: number): number {
  return normalized * pageDimension;
}

export function pointToNormalized(
  point: [number, number],
  pageWidth: number,
  pageHeight: number,
): [number, number] {
  return [toNormalized(point[0], pageWidth), toNormalized(point[1], pageHeight)];
}

export function pointToPixels(
  point: [number, number],
  pageWidth: number,
  pageHeight: number,
): [number, number] {
  return [toPixels(point[0], pageWidth), toPixels(point[1], pageHeight)];
}
