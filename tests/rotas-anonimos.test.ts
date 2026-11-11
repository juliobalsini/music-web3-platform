import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// Rotas e ações que escrevem conteúdo DEVEM usar getSessionRole() (conta de verdade; recusa
// anônimo) e nunca getSessaoAny() (aceita anônimo) nem a sessão crua. Se alguém trocar por
// engano, estes testes quebram antes de ligar o login anônimo em produção.
const SO_CONTA = [
  "app/api/tracks/upload/route.ts",
  "app/api/albums/upload/route.ts",
  "app/api/tracks/[id]/publish/route.ts",
  "app/curador/actions.ts",
  "app/curador/page.tsx",
  "app/enviar/page.tsx",
  "app/onboarding/page.tsx",
];

describe("rotas de servidor recusam anônimos", () => {
  for (const arq of SO_CONTA) {
    it(`${arq} usa getSessionRole (recusa anônimo)`, () => {
      const src = ler(arq);
      assert.match(src, /getSessionRole\(\)/);
      assert.doesNotMatch(src, /getSessaoAny/);
    });
  }

  it("getSessionRole devolve null para anônimo", () => {
    const src = ler("lib/session.ts");
    assert.match(src, /s && !s\.anonimo \? s : null/);
    assert.match(src, /anonimo: data\.user\.is_anonymous === true/);
  });

  it("onboarding (troca de papel) recusa anônimo no servidor", () => {
    const src = ler("app/onboarding/actions.ts");
    assert.match(src, /data\.user\.is_anonymous/);
    assert.match(src, /redirect\("\/login\?next=\/onboarding"\)/);
  });

  it("upload e publicação exigem papel artist; curador exige curator", () => {
    assert.match(ler("app/api/tracks/upload/route.ts"), /role !== "artist"/);
    assert.match(ler("app/api/albums/upload/route.ts"), /role !== "artist"/);
    assert.match(ler("app/api/tracks/[id]/publish/route.ts"), /role !== "artist"/);
    assert.match(ler("app/curador/actions.ts"), /role !== "curator"/);
  });

  it("nenhum cliente de escrita do usuário fora das rotas auditadas", () => {
    // Toda escrita com service_role precisa estar numa rota/ação já coberta acima ou nas de escuta/reação.
    const permitidos = new Set([
      "app/api/tracks/upload/route.ts",
      "app/api/albums/upload/route.ts",
      "app/api/tracks/[id]/publish/route.ts",
      "app/api/tracks/[id]/reacao/route.ts",
      "app/api/listen/start/route.ts",
      "app/api/listen/beat/route.ts",
      "app/curador/actions.ts",
      "app/onboarding/actions.ts",
    ]);
    const achados = ["app", "lib", "components"]
      .flatMap((d) => listar(d))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => {
        const src = ler(f);
        const usaBanco = /createAdminClient|supabase/i.test(src);
        return usaBanco && /\.(insert|update|upsert|delete|rpc)\(/.test(src.replace(/cookies\.delete\(/g, ""));
      });
    for (const f of achados) assert.ok(permitidos.has(f), `escrita não auditada para anônimos: ${f}`);
  });

  it("reação 'apoiar' exige conta; curtir/salvar valem para anônimo", () => {
    const src = ler("app/api/tracks/[id]/reacao/route.ts");
    assert.match(src, /sessao\.anonimo && kind === "support"/);
    assert.match(src, /getSessaoAny\(\)/);
  });

  it("escuta: anônimo usa teto próprio, sempre menor ou igual ao da conta", () => {
    const beat = ler("app/api/listen/beat/route.ts");
    assert.match(beat, /is_anonymous \? cfg\.anonDailyLimit : cfg\.dailyLimit/);
    // O usuário vem da sessão, nunca do corpo do pedido.
    assert.doesNotMatch(beat, /body\??\.(userId|user)/);
    assert.doesNotMatch(ler("app/api/listen/start/route.ts"), /body\??\.(userId|user)/);
  });

  it("start só cria sessão anônima para faixa publicada", () => {
    const src = ler("app/api/listen/start/route.ts");
    assert.ok(src.indexOf('.eq("status", "published")') < src.indexOf("signInAnonymously"));
  });
});

import { readdirSync, statSync } from "node:fs";
function listar(dir: string): string[] {
  return readdirSync(new URL(`../${dir}`, import.meta.url)).flatMap((n) => {
    const rel = `${dir}/${n}`;
    return statSync(new URL(`../${rel}`, import.meta.url)).isDirectory() ? listar(rel) : [rel];
  });
}
