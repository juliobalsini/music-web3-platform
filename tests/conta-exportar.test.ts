import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { FONTES_EXPORTACAO, MAX_LINHAS_EXPORTACAO, nomeArquivoExportacao } from "../lib/conta/exportar.ts";

describe("Exportar meus dados", () => {
  it("toda tabela tem coluna dona; chaves únicas; inclui escutas e pontos", () => {
    const chaves = FONTES_EXPORTACAO.map((f) => f.chave);
    assert.equal(new Set(chaves).size, chaves.length);
    for (const f of FONTES_EXPORTACAO) assert.match(f.dono, /^(id|user_id|artist_id|curator_id|author_id|follower_id)$/);
    for (const t of ["listen_events", "points_ledger", "profiles", "user_settings"]) assert.ok(FONTES_EXPORTACAO.some((f) => f.tabela === t));
    assert.ok(MAX_LINHAS_EXPORTACAO > 0 && MAX_LINHAS_EXPORTACAO <= 10000);
  });

  it("nome do arquivo com a data UTC", () => {
    assert.equal(nomeArquivoExportacao(new Date("2026-11-17T23:59:00Z")), "radioon-meus-dados-2026-11-17.json");
  });

  it("rota: só conta de verdade, sessão (RLS) e filtro pela coluna dona; nunca service_role", () => {
    const t = readFileSync(new URL("../app/api/conta/exportar/route.ts", import.meta.url), "utf8");
    assert.match(t, /getSessionRole\(\)/);
    assert.doesNotMatch(t, /getSessaoAny|createAdminClient|supabase\/admin/);
    assert.match(t, /\.eq\(f\.dono, userId\)/);
    assert.match(t, /no-store/);
  });
});
