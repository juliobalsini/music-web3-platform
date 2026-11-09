import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { listenConfig } from "../lib/listen/config.ts";

describe("listen", () => {
  it("config tem padrões seguros e ignora valores inválidos", () => {
    assert.deepEqual(listenConfig({}), { points: 10, dailyLimit: 200, maxPerTrack: 3 });
    assert.equal(listenConfig({ POINTS_PER_LISTEN: "-5" }).points, 10);
    assert.equal(listenConfig({ POINTS_DAILY_LIMIT: "500" }).dailyLimit, 500);
  });
  it("migration só confia no servidor: sem SECURITY DEFINER e com checagem de papel", () => {
    const sql = readFileSync(new URL("../supabase/migrations/20261109000000_listen_heartbeats.sql", import.meta.url), "utf8")
      .replace(/--.*$/gm, "");
    assert.doesNotMatch(sql, /security definer/i);
    assert.equal((sql.match(/'service_role'/g) ?? []).length, 2);
    assert.match(sql, />= 30/);
  });
});
