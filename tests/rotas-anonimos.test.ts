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
  "app/api/stories/route.ts",
  "app/api/stories/[id]/imagem/route.ts",
  "app/api/stories/[id]/denunciar/route.ts",
  "app/stories/novo/page.tsx",
  "app/api/tracks/[id]/publish/route.ts",
  "app/curador/actions.ts",
  "app/curador/page.tsx",
  "app/playlist/actions.ts",
  "app/playlist/nova/page.tsx",
  "app/enviar/page.tsx",
  "app/onboarding/page.tsx",
  "app/seguindo/actions.ts",
  "app/seguindo/page.tsx",
  "app/meus-envios/actions.ts",
  "app/meus-envios/page.tsx",
  "components/menu-dono.tsx",
  "app/api/conta/exportar/route.ts",
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

  it("artista é ativado no 1º envio só no servidor: ouvinte direto, playlister com confirmação", () => {
    for (const f of ["app/api/tracks/upload/route.ts", "app/api/albums/upload/route.ts"]) {
      assert.match(ler(f), /papelNoEnvio\(sessao\.role\) === "ativa" && \(await ativarArtista\(sessao\.userId\)\)/, f);
    }
    const acao = ler("app/enviar/actions.ts");
    assert.match(acao, /const s = await getSessionRole\(\);\s+if \(!s\) redirect/);
    assert.match(acao, /ativarArtista\(s\.userId, \["curator"\]\)/);
    const lib = ler("lib/auth/ativar-artista.ts");
    assert.match(lib, /import "server-only"/);
    assert.match(lib, /\.eq\("id", userId\)\.in\("role", \[\.\.\.de\]\)/);
  });

  it("nenhum cliente de escrita do usuário fora das rotas auditadas", () => {
    // Toda escrita com service_role precisa estar numa rota/ação já coberta acima ou nas de escuta/reação.
    const permitidos = new Set([
      "app/api/tracks/upload/route.ts",
      "app/api/albums/upload/route.ts",
      "app/api/stories/route.ts",
      "app/api/stories/[id]/imagem/route.ts",
      "app/api/stories/[id]/denunciar/route.ts",
      "app/api/stories/[id]/route.ts",
      "app/api/stories/[id]/visualizar/route.ts",
      "app/api/stories/[id]/curtir/route.ts",
      "app/api/stories/[id]/comentarios/route.ts",
      "app/api/stories/comentarios/[cid]/route.ts",
      "app/api/stories/comentarios/[cid]/denunciar/route.ts",
      "app/api/tracks/[id]/publish/route.ts",
      "lib/tracks/reconciliar.ts", // só chamada de /meus-envios, depois de getSessionRole (anônimo = null), e só nas faixas do próprio usuário
      "app/api/tracks/[id]/reacao/route.ts",
      "app/api/listen/start/route.ts",
      "app/api/listen/beat/route.ts",
      "app/curador/actions.ts",
      "app/playlist/actions.ts",
      "app/onboarding/actions.ts",
      "lib/auth/ativar-artista.ts", // só chamada das rotas de envio e de app/enviar/actions.ts, depois de getSessionRole; id da sessão
      "app/seguindo/actions.ts", // getSessionRole (anônimo = null) + RLS restritiva de follows
      "app/ajustes/actions.ts", // cada ação começa com getSessionRole (anônimo = null); o dono vem da sessão
      "lib/preferencias/conta.ts", // só chamada de app/ajustes/actions.ts, depois de getSessionRole; filtra pelo dono
      "lib/envios/apagar.ts", // só chamada de app/meus-envios/actions.ts e app/playlist/actions.ts, depois de getSessionRole; filtra pelo dono
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

  it("configurações: toda ação exige conta (getSessionRole) e excluir exige a palavra de confirmação", () => {
    const src = ler("app/ajustes/actions.ts");
    const acoes = src.split("export async function").slice(1);
    assert.equal(acoes.length, 5);
    for (const a of acoes) assert.match(a, /const s = await getSessionRole\(\);\s+if \(!s\) return SEM_CONTA;/);
    // Story de bio: só artista grava a frase/foto, e a foto vem da conta Google lida no servidor.
    assert.match(src, /s\.role !== "artist"/);
    assert.match(src, /fotoSegura\(/);
    assert.match(src, /confirmouExclusao\(form\.get\("confirmacao"\)\)/);
  });

  it("stories v2: comentar, apagar e denunciar exigem conta; visualizar/curtir usam o cliente do usuário (RLS)", () => {
    for (const f of ["app/api/stories/[id]/comentarios/route.ts", "app/api/stories/[id]/route.ts", "app/api/stories/comentarios/[cid]/route.ts", "app/api/stories/comentarios/[cid]/denunciar/route.ts"]) {
      assert.match(ler(f), /getSessionRole\(\)/, f);
    }
    for (const f of ["app/api/stories/[id]/visualizar/route.ts", "app/api/stories/[id]/curtir/route.ts"]) {
      const src = ler(f);
      assert.doesNotMatch(src, /createAdminClient/, f);
      assert.match(src, /s\.userId/, f);
    }
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

describe("exclusão lógica: dono vem da sessão e entra no filtro de toda escrita", () => {
  it("apagar/desfazer/renomear filtram pela coluna do dono e nunca usam DELETE", () => {
    const src = ler("lib/envios/apagar.ts");
    assert.doesNotMatch(src, /\.delete\(/);
    const updates = src.split(".update(").slice(1).map((trecho) => trecho.slice(0, trecho.indexOf(";")));
    assert.ok(updates.length >= 3);
    for (const u of updates) assert.match(u, /\.eq\((dono|"artist_id"), userId\)/);
    assert.match(ler("app/meus-envios/actions.ts"), /sessao\.userId/);
  });

  it("apagar playlist é lógico (sem DELETE na tabela playlists)", () => {
    assert.doesNotMatch(ler("app/playlist/actions.ts"), /from\("playlists"\)\.delete\(/);
  });

  it("leituras com service_role de faixa publicada repetem o filtro de apagadas", () => {
    for (const f of ["app/api/listen/start/route.ts", "app/api/tracks/[id]/reacao/route.ts", "app/api/stories/route.ts", "app/api/tracks/[id]/play/route.ts"]) {
      assert.match(ler(f), /\.is\("deleted_at", null\)/, f);
    }
  });
});
