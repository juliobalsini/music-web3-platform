import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validarSql } from "../scripts/ci/validar-sql.mjs";

const ok = (sql: string) => assert.deepEqual(validarSql(sql), [], sql);
const bloqueia = (sql: string, motivo?: RegExp) => {
  const erros: string[] = validarSql(sql);
  assert.ok(erros.length > 0, `deveria bloquear: ${sql}`);
  if (motivo) assert.match(erros.join("\n"), motivo);
};

describe("scripts/ci/validar-sql — allowlist de migrations", () => {
  it("aceita tabela nova com RLS, índice e policy", () => {
    ok(`
      -- comentário com DROP TABLE que deve ser ignorado
      create table if not exists public.follows (
        follower_id uuid not null references public.profiles(id) on delete cascade,
        artist_id uuid not null,
        created_at timestamptz not null default now(),
        primary key (follower_id, artist_id)
      );
      alter table public.follows enable row level security;
      create index follows_artist_idx on public.follows (artist_id);
      create policy "seguidor lê os próprios" on public.follows
        for select to authenticated using (follower_id = (select auth.uid()));
    `);
  });

  it("aceita ADD COLUMN anulável e ADD VALUE em enum", () => {
    ok(`alter table public.tracks add column if not exists genre text;
        alter type public.track_status add value if not exists 'archived' after 'removed';`);
  });

  it("aceita função plpgsql e trigger novos", () => {
    ok(`create function public.touch() returns trigger language plpgsql set search_path = '' as $fn$
        begin new.updated_at := now(); return new; end; $fn$;
        create trigger touch_tracks before update on public.tracks
          for each row execute function public.touch();`);
  });

  it("bloqueia instruções destrutivas e fora da lista", () => {
    bloqueia("drop table public.tracks;", /fora da allowlist/);
    bloqueia("delete from public.points_ledger;");
    bloqueia("truncate public.listen_events;");
    bloqueia("alter table public.tracks drop column title;");
    bloqueia("update public.profiles set role = 'curator';");
    bloqueia("grant all on public.tracks to anon;");
    bloqueia("alter table public.tracks disable row level security;");
    bloqueia("create or replace function public.f() returns int language sql as $$ select 1 $$;");
  });

  it("bloqueia ADD COLUMN obrigatório ou com múltiplas ações", () => {
    bloqueia("alter table public.tracks add column bpm int not null default 0;", /anulável/);
    bloqueia("alter table public.tracks add column bpm int, drop column title;", /mais de uma ação/);
  });

  it("bloqueia tabela sem RLS", () => {
    bloqueia("create table public.x (id int);", /sem ENABLE ROW LEVEL SECURITY/);
  });

  it("bloqueia corpo de função perigoso, SECURITY DEFINER e linguagens externas", () => {
    bloqueia("create function public.f() returns void language plpgsql as $$ begin delete from public.tracks; end $$;", /DELETE/);
    bloqueia("create function public.f() returns void language plpgsql as $$ begin execute 'select 1'; end $$;", /EXECUTE/);
    bloqueia("create function public.f() returns void language sql as 'drop table public.tracks';", /DROP/);
    bloqueia("create function public.f() returns int language sql security definer as $$ select 1 $$;", /SECURITY DEFINER/);
    bloqueia("create function public.f() returns int language plpython3u as $$ return 1 $$;", /linguagem/);
  });

  it("não se deixa enganar por ponto e vírgula dentro de strings e dollar-quotes", () => {
    bloqueia("create policy p on public.tracks using (title <> ';'); drop table public.tracks;");
    bloqueia("create function public.f() returns int language sql as $a$ select 1 $a$; drop schema public cascade;");
  });

  it("bloqueia SQL malformado", () => {
    bloqueia("create policy p on public.tracks using (title = 'aberto);", /sem fechamento/);
  });
});
