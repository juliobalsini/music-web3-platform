import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { agregarMetricas } from "../lib/tracks/rules.ts";

describe("métricas", () => {
  it("conta só escutas válidas e ouvintes únicos", () => {
    const m = agregarMetricas([
      { track_id: "a", user_id: "u1", is_valid: true },
      { track_id: "a", user_id: "u1", is_valid: true },
      { track_id: "a", user_id: "u2", is_valid: true },
      { track_id: "a", user_id: "u3", is_valid: false },
      { track_id: "b", user_id: "u1", is_valid: false },
    ]);
    assert.deepEqual(m.get("a"), { trackId: "a", escutas: 3, ouvintes: 2 });
    assert.equal(m.has("b"), false);
  });
});
