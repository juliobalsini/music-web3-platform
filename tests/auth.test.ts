import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { loginPath, parseEmail, parseRole, safeNext } from "../lib/auth/roles.ts";

describe("auth", () => {
  it("parseRole só aceita os 3 perfis do MVP", () => {
    assert.equal(parseRole("artist"), "artist");
    assert.equal(parseRole("admin"), null);
    assert.equal(parseRole(undefined), null);
  });
  it("safeNext bloqueia open redirect", () => {
    assert.equal(safeNext("/enviar"), "/enviar");
    assert.equal(safeNext("//evil.com"), "/");
    assert.equal(safeNext("https://evil.com"), "/");
    assert.equal(safeNext("/\\evil.com"), "/");
  });
  it("loginPath lembra o destino e ignora destino inseguro", () => {
    assert.equal(loginPath("/enviar"), "/login?next=%2Fenviar");
    assert.equal(loginPath("/playlist/abc?x=1"), "/login?next=%2Fplaylist%2Fabc%3Fx%3D1");
    assert.equal(loginPath("/"), "/login");
    assert.equal(loginPath("//evil.com"), "/login");
  });
  it("parseEmail", () => {
    assert.equal(parseEmail(" A@b.co "), "a@b.co");
    assert.equal(parseEmail("x"), null);
  });
});

describe("RLS (análise estática da migration)", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261105000000_initial_schema.sql", import.meta.url), "utf8");
  it("todas as tabelas têm RLS e o role não é atualizável pelo usuário", () => {
    for (const t of ["profiles", "tracks", "playlists", "playlist_tracks", "listen_events", "points_ledger"]) {
      assert.match(sql, new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    }
    assert.match(sql, /grant update \(display_name\) on public\.profiles to authenticated/);
    assert.doesNotMatch(sql, /grant update[^;]*\brole\b[^;]*to authenticated/);
  });
  it("só curador cria playlist", () => {
    assert.match(sql, /current_user_role\(\)\) = 'curator'/);
  });
});
