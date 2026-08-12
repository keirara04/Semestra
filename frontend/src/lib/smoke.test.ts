import { describe, expect, it } from "vitest";

// Placeholder so `vitest run` has something to run in CI — replace as
// real engine/lib code lands. Deliberately doesn't import api.ts, which
// requires NEXT_PUBLIC_API_URL to be set.
describe("smoke", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});
