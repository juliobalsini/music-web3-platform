import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import { PGlite } from "@electric-sql/pglite";

// Roda as migrations REAIS num Postgres de verdade (PGlite, WASM) com o essencial do Supabase
// emulado: papéis anon/authenticated/service_role, auth.users, auth.uid(), auth.jwt() e os
// privilégios padrão do schema public. Nada aqui toca o banco de produção.

const SETUP = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, is_anonymous boolean not null default false, raw_user_meta_data jsonb);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true), (auth.jwt() ->> 'sub')), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const db = new PGlite();
const ids = {
  anon: "00000000-0000-4000-8000-0000000000a1",
  conta: "00000000-0000-4000-8000-0000000000b1",
  artista: "00000000-0000-4000-8000-0000000000c1",
  curador: "00000000-0000-4000-8000-0000000000d1",
  faixa: "00000000-0000-4000-8000-0000000000f1",
  playlist: "00000000-0000-4000-8000-0000000000e1",
};

type Quem = "anon" | "conta" | "artista" | "curador" | "service";

/** Executa SQL como um papel do Supabase com o JWT correspondente; devolve linhas ou o erro. */
async function como(quem: Quem, sql: string, params: unknown[] = []) {
  const claims =
    quem === "service"
      ? { role: "service_role" }
      : { role: "authenticated", sub: ids[quem], is_anonymous: quem === "anon" };
  const papel = quem === "service" ? "service_role" : "authenticated";
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await db.exec(`set local role ${papel}`);
    const r = await db.query<Record<string, unknown>>(sql, params);
    await db.exec("commit");
    return { rows: r.rows, affected: r.affectedRows ?? 0, error: null as string | null };
  } catch (e) {
    await db.exec("rollback");
    return { rows: [], affected: 0, error: (e as Error).message };
  }
}

before(async () => {
  await db.exec(SETUP);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
  }
  // Usuários (o trigger cria os profiles como listener) e papéis definidos pelo "servidor".
  await db.exec(`
    insert into auth.users (id, is_anonymous) values ('${ids.anon}', true);
    insert into auth.users (id, email) values ('${ids.conta}', 'a@x.com'), ('${ids.artista}', 'b@x.com'), ('${ids.curador}', 'c@x.com');
    update public.profiles set role = 'artist' where id = '${ids.artista}';
    update public.profiles set role = 'curator' where id = '${ids.curador}';
    insert into public.tracks (id, artist_id, title, r2_key, duration_sec, status, rights_confirmed)
      values ('${ids.faixa}', '${ids.artista}', 'Faixa', 'tracks/x/1', 180, 'published', true);
    insert into public.playlists (id, curator_id, title) values ('${ids.playlist}', '${ids.curador}', 'Lista');
  `);
});
after(() => db.close());

describe("RLS — visitante anônimo (is_anonymous = true)", () => {
  it("não muda o papel (nem por update direto)", async () => {
    const r = await como("anon", `update public.profiles set role = 'curator' where id = '${ids.anon}'`);
    assert.match(r.error ?? "", /permission denied/);
    const p = await db.query<{ role: string }>(`select role from public.profiles where id = '${ids.anon}'`);
    assert.equal(p.rows[0].role, "listener");
  });

  it("não muda nem o nome do perfil, mas a conta comum muda o próprio", async () => {
    const anon = await como("anon", `update public.profiles set display_name = 'x' where id = '${ids.anon}'`);
    assert.equal(anon.error, null);
    assert.equal(anon.affected, 0);
    const conta = await como("conta", `update public.profiles set display_name = 'Ana' where id = '${ids.conta}'`);
    assert.equal(conta.affected, 1);
  });

  it("não envia faixa (insert/update/delete em tracks)", async () => {
    const ins = await como(
      "anon",
      `insert into public.tracks (artist_id, title, r2_key) values ('${ids.anon}', 't', 'k/anon')`,
    );
    assert.ok(ins.error, "insert deveria falhar");
    const upd = await como("anon", `update public.tracks set title = 'hack'`);
    assert.ok(upd.error || upd.affected === 0);
    const del = await como("anon", `delete from public.tracks`);
    assert.ok(del.error || del.affected === 0);
    const n = await db.query<{ n: number }>(`select count(*)::int as n from public.tracks`);
    assert.equal(n.rows[0].n, 1);
  });

  it("não cria playlist, mesmo se o papel fosse curator (restrictive vale sobre a permissiva)", async () => {
    // Pior caso: o profile anônimo tivesse virado curador por engano/bug.
    await db.exec(`update public.profiles set role = 'curator' where id = '${ids.anon}'`);
    const anon = await como(
      "anon",
      `insert into public.playlists (curator_id, title, is_public) values ('${ids.anon}', 'minha', true)`,
    );
    await db.exec(`update public.profiles set role = 'listener' where id = '${ids.anon}'`);
    assert.match(anon.error ?? "", /row-level security/);
  });

  it("não mexe em playlists, itens, notas ou programação alheios", async () => {
    await db.exec(`insert into public.playlist_tracks (playlist_id, track_id, position) values ('${ids.playlist}', '${ids.faixa}', 0)`);
    for (const sql of [
      `update public.playlists set title = 'x'`,
      `delete from public.playlists`,
      `update public.playlist_tracks set position = 5`,
      `delete from public.playlist_tracks`,
      `update public.playlist_tracks set note = 'spam'`,
      `delete from public.programs`,
    ]) {
      const r = await como("anon", sql);
      assert.ok(r.error || r.affected === 0, `deveria bloquear: ${sql}`);
    }
    const ins = await como(
      "anon",
      `insert into public.playlist_tracks (playlist_id, track_id, position) values ('${ids.playlist}', '${ids.faixa}', 9)`,
    );
    assert.ok(ins.error);
    const prog = await como(
      "anon",
      `insert into public.programs (curator_id, playlist_id, title, start_hour, end_hour) values ('${ids.anon}', '${ids.playlist}', 'p', 1, 2)`,
    );
    assert.ok(prog.error);
  });

  it("não escreve direto em escutas, pontos nem reações", async () => {
    const ev = await como("anon", `insert into public.listen_events (user_id, track_id, is_valid) values ('${ids.anon}', '${ids.faixa}', true)`);
    assert.ok(ev.error);
    const pt = await como("anon", `insert into public.points_ledger (user_id, amount, reason) values ('${ids.anon}', 999, 'listen')`);
    assert.ok(pt.error);
    const re = await como("anon", `insert into public.track_reactions (user_id, track_id, kind) values ('${ids.anon}', '${ids.faixa}', 'like')`);
    assert.ok(re.error);
  });

  it("não chama as funções de escuta direto (só service_role)", async () => {
    const a = await como("anon", `select public.listen_start('${ids.anon}', '${ids.faixa}')`);
    assert.match(a.error ?? "", /acesso negado/);
    const b = await como("anon", `select public.listen_beat('${ids.anon}', '${ids.faixa}', 10, 50, 3)`);
    assert.match(b.error ?? "", /acesso negado/);
  });

  it("continua lendo o catálogo público e os próprios dados", async () => {
    const t = await como("anon", `select id from public.tracks`);
    assert.equal(t.rows.length, 1);
    const p = await como("anon", `select id from public.playlists`);
    assert.equal(p.rows.length, 1);
  });
});

describe("RLS — contas de verdade continuam funcionando", () => {
  it("curador cria playlist; conta comum (listener) também cria a própria (decisão do plano, migration 20261111030000)", async () => {
    const ok = await como("curador", `insert into public.playlists (curator_id, title) values ('${ids.curador}', 'nova')`);
    assert.equal(ok.error, null);
    const conta = await como("conta", `insert into public.playlists (curator_id, title) values ('${ids.conta}', 'nova')`);
    assert.equal(conta.error, null);
  });

  it("conta não muda o próprio papel direto no banco", async () => {
    const r = await como("conta", `update public.profiles set role = 'curator' where id = '${ids.conta}'`);
    assert.match(r.error ?? "", /permission denied/);
  });

  it("curador reordena e remove item da própria playlist; programa só nas próprias", async () => {
    const mv = await como("curador", `update public.playlist_tracks set position = 3 where playlist_id = '${ids.playlist}'`);
    assert.equal(mv.affected, 1);
    const prog = await como(
      "curador",
      `insert into public.programs (curator_id, playlist_id, title, start_hour, end_hour) values ('${ids.curador}', '${ids.playlist}', 'p', 1, 2)`,
    );
    assert.equal(prog.error, null);
    const del = await como("curador", `delete from public.playlist_tracks where playlist_id = '${ids.playlist}'`);
    assert.equal(del.affected, 1);
  });
});

describe("Escuta e pontos do anônimo (funções reais, via service_role)", () => {
  const TETO_ANON = 50;
  const PONTOS = 10;

  /** Abre uma escuta e simula 30 s de escuta contínua (relógio do servidor: atrasa o início). */
  async function escutar(user: string, faixa: string, teto: number) {
    const s = await como("service", `select public.listen_start($1, $2) as id`, [user, faixa]);
    assert.equal(s.error, null);
    const evento = s.rows[0].id as string;
    await db.query(
      `update public.listen_events set seconds_listened = 20, last_beat_at = now() - interval '10 seconds' where id = $1`,
      [evento],
    );
    const b = await como("service", `select public.listen_beat($1, $2, $3, $4, 3) as r`, [user, evento, PONTOS, teto]);
    assert.equal(b.error, null);
    return b.rows[0].r as { ok: boolean; valid: boolean; points: number; motivo: string | null };
  }

  it("anônimo registra escuta e pontua até o teto diário próprio, e nem um ponto além", async () => {
    // 6 faixas de artista (anônimo nunca é o artista) para não esbarrar no limite por faixa.
    const faixas: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await db.query<{ id: string }>(
        `insert into public.tracks (artist_id, title, r2_key, duration_sec, status, rights_confirmed)
         values ('${ids.artista}', 'T${i}', 'tracks/x/anon${i}', 180, 'published', true) returning id`,
      );
      faixas.push(r.rows[0].id);
    }
    const resultados = [];
    for (const f of faixas) resultados.push(await escutar(ids.anon, f, TETO_ANON));
    assert.deepEqual(resultados.slice(0, 5).map((r) => r.points), [10, 10, 10, 10, 10]);
    assert.ok(resultados.slice(0, 5).every((r) => r.valid));
    assert.equal(resultados[5].points, 0);
    assert.equal(resultados[5].motivo, "limite_diario");
    const soma = await db.query<{ s: number }>(
      `select coalesce(sum(amount), 0)::int as s from public.points_ledger where user_id = '${ids.anon}'`,
    );
    assert.equal(soma.rows[0].s, TETO_ANON);
  });

  it("o anônimo lê os próprios pontos, e só os dele", async () => {
    const r = await como("anon", `select user_id from public.points_ledger`);
    assert.ok(r.rows.length > 0);
    assert.ok(r.rows.every((l) => l.user_id === ids.anon));
    const outro = await como("conta", `select user_id from public.points_ledger`);
    assert.equal(outro.rows.length, 0);
  });

  it("conta de verdade continua com o teto maior (200)", async () => {
    const r = await escutar(ids.conta, ids.faixa, 200);
    assert.equal(r.points, PONTOS);
  });

  it("artista não pontua na própria faixa (mesmo regra para qualquer sessão)", async () => {
    const r = await escutar(ids.artista, ids.faixa, 200);
    assert.equal(r.points, 0);
    assert.equal(r.motivo, "faixa");
  });
});

describe("RLS — playlists para qualquer conta e álbuns (migration 20261111030000)", () => {
  it("conta comum (listener) cria playlist própria; não cria em nome de outro", async () => {
    const ok = await como("conta", `insert into public.playlists (curator_id, title) values ('${ids.conta}', 'Minha') returning id`);
    assert.equal(ok.error, null);
    assert.equal(ok.rows.length, 1);
    const alheia = await como("conta", `insert into public.playlists (curator_id, title) values ('${ids.curador}', 'Falsa')`);
    assert.match(alheia.error ?? "", /row-level security/);
  });

  it("anônimo continua sem criar playlist (restritiva vence a nova permissiva)", async () => {
    const r = await como("anon", `insert into public.playlists (curator_id, title) values ('${ids.anon}', 'Anon')`);
    assert.match(r.error ?? "", /row-level security|permission denied/);
  });

  it("álbuns: leitura pública; escrita só pelo servidor", async () => {
    const album = "00000000-0000-4000-8000-0000000000a9";
    const srv = await como("service", `insert into public.albums (id, artist_id, title, kind) values ('${album}', '${ids.artista}', 'Sinais', 'ep')`);
    assert.equal(srv.error, null);
    const ler = await como("anon", `select id from public.albums`);
    assert.equal(ler.rows.length, 1);
    const escrever = await como("artista", `insert into public.albums (artist_id, title) values ('${ids.artista}', 'Direto')`);
    assert.match(escrever.error ?? "", /row-level security|permission denied/);
    const kind = await como("service", `insert into public.albums (artist_id, title, kind) values ('${ids.artista}', 'X', 'single')`);
    assert.match(kind.error ?? "", /check/);
  });

  it("faixa pode apontar para o álbum e ter número", async () => {
    const r = await como("service", `update public.tracks set album_id = '00000000-0000-4000-8000-0000000000a9', track_no = 1 where id = '${ids.faixa}'`);
    assert.equal(r.error, null);
    const ruim = await como("service", `update public.tracks set track_no = 0 where id = '${ids.faixa}'`);
    assert.match(ruim.error ?? "", /check/);
  });
});

describe("RLS — stories e denúncias (migration 20261111040000)", () => {
  const oculto = "00000000-0000-4000-8000-0000000000b9";
  const visivel = "00000000-0000-4000-8000-0000000000b8";
  before(async () => {
    await db.exec(`
      insert into public.stories (id, author_id, body, hidden) values
        ('${visivel}', '${ids.artista}', 'visível', false),
        ('${oculto}', '${ids.artista}', 'oculto', true);
      insert into public.story_reports (story_id, reporter_id) values ('${visivel}', '${ids.conta}');
    `);
  });

  it("público lê só os não ocultos; o autor lê também os próprios ocultos", async () => {
    const anon = await como("anon", `select id from public.stories`);
    assert.deepEqual(anon.rows.map((r) => r.id), [visivel]);
    const autor = await como("artista", `select id from public.stories`);
    assert.equal(autor.rows.length, 2);
    const outro = await como("conta", `select id from public.stories`);
    assert.equal(outro.rows.length, 1);
  });

  it("nenhum cliente escreve em stories (nem o autor); só o servidor", async () => {
    const ins = await como("artista", `insert into public.stories (author_id, body) values ('${ids.artista}', 'direto')`);
    assert.match(ins.error ?? "", /row-level security|permission denied/);
    const upd = await como("artista", `update public.stories set hidden = false where id = '${oculto}'`);
    assert.equal(upd.affected, 0);
    const srv = await como("service", `update public.stories set hidden = true where id = '${visivel}'`);
    assert.equal(srv.affected, 1);
    await como("service", `update public.stories set hidden = false where id = '${visivel}'`);
  });

  it("denúncias: ninguém lê nem escreve pelo cliente; uma por conta e story", async () => {
    for (const quem of ["anon", "conta", "artista"] as const) {
      const ler = await como(quem, `select * from public.story_reports`);
      assert.equal(ler.rows.length, 0, quem);
      const ins = await como(quem, `insert into public.story_reports (story_id, reporter_id) values ('${visivel}', '${ids[quem]}')`);
      assert.match(ins.error ?? "", /row-level security|permission denied/, quem);
    }
    const dup = await como("service", `insert into public.story_reports (story_id, reporter_id) values ('${visivel}', '${ids.conta}')`);
    assert.match(dup.error ?? "", /duplicate key/);
    const n = await como("service", `select count(*)::int as n from public.story_reports where story_id = '${visivel}'`);
    assert.equal(n.rows[0].n, 1);
  });

  it("tamanho do texto e do trecho respeitam as checagens", async () => {
    const longo = await como("service", `insert into public.stories (author_id, body) values ('${ids.artista}', '${"x".repeat(281)}')`);
    assert.match(longo.error ?? "", /check/);
    const clip = await como("service", `insert into public.stories (author_id, body, track_id, clip_start) values ('${ids.artista}', 'a', '${ids.faixa}', 9000)`);
    assert.match(clip.error ?? "", /check/);
  });
});
