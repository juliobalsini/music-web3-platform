-- radioOn — Stories v2, fase 2 (aditiva): curtidas, comentários (só contas, até 140 caracteres) e moderação.
-- Curtir: um por usuário ou sessão anônima. Comentar: apenas conta (anônimo nunca), com limite de frequência
-- aplicado por trigger. Apagar/ocultar comentários e denúncias passam pelo servidor (sem policy de update).

create table public.story_likes (
  story_id   uuid not null references public.stories (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
alter table public.story_likes enable row level security;

create policy "story_likes: vê as próprias ou as do próprio story"
  on public.story_likes for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.stories s where s.id = story_id and s.author_id = (select auth.uid()))
  );

create policy "story_likes: curte só como si mesmo"
  on public.story_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "story_likes: descurte só a própria"
  on public.story_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

create table public.story_comments (
  id         uuid primary key default gen_random_uuid(),
  story_id   uuid not null references public.stories (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  kind       text not null default 'texto' check (kind in ('texto', 'reacao', 'figurinha')),
  body       text not null check (char_length(body) between 1 and 140),
  hidden     boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index story_comments_story_idx on public.story_comments (story_id, created_at desc);
create index story_comments_author_idx on public.story_comments (author_id, created_at desc);
alter table public.story_comments enable row level security;

-- Público lê comentários não ocultos nem apagados (só de stories que ele próprio consegue ler, via RLS de stories).
create policy "story_comments: leitura pública (não ocultos)"
  on public.story_comments for select
  to anon, authenticated
  using (not hidden and deleted_at is null and exists (select 1 from public.stories s where s.id = story_id));

-- O autor enxerga os próprios comentários mesmo ocultos (necessário para o limite de frequência abaixo).
create policy "story_comments: autor vê os próprios"
  on public.story_comments for select
  to authenticated
  using (author_id = (select auth.uid()));

-- Só conta (nunca anônimo) comenta, como si mesma.
create policy "story_comments: conta comenta como si mesma"
  on public.story_comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
    and not hidden
    and deleted_at is null
  );

-- Limite de frequência: no máx. 5 comentários por minuto por autor (trigger: a policy não pode ler a própria tabela).
create function public.story_comments_limite() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.story_comments c where c.author_id = new.author_id and c.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'limite de comentários por minuto' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger story_comments_limite
  before insert on public.story_comments
  for each row execute function public.story_comments_limite();

create table public.story_comment_reports (
  comment_id  uuid not null references public.story_comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, reporter_id)
);
alter table public.story_comment_reports enable row level security;
-- Sem policies: só o servidor (service_role) grava e lê denúncias de comentários.
