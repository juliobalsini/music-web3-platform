-- radioOn — Stories v1 (aditiva): texto + imagem + trecho opcional de 15 s de uma faixa da plataforma.
-- Vale 7 dias na faixa de stories da home; depois ficam no perfil do autor (não há expiração por DELETE).
-- Escrita só pelo servidor (service_role), que confere papel (artista, playlister ou plataforma).
-- Moderação: denúncias (só de contas) e ocultação automática após 3 denúncias distintas (`hidden`).

create table public.stories (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  is_platform boolean not null default false,
  body        text check (body is null or char_length(body) <= 280),
  image_key   text check (image_key is null or char_length(image_key) <= 300),
  track_id    uuid references public.tracks (id),
  clip_start  smallint check (clip_start is null or clip_start between 0 and 7200),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index stories_created_idx on public.stories (created_at desc);
create index stories_author_idx on public.stories (author_id, created_at desc);
alter table public.stories enable row level security;

-- Público lê o que não foi ocultado; o autor sempre vê os próprios (inclusive ocultos).
create policy "stories: leitura pública (não ocultos) ou próprios"
  on public.stories for select
  to anon, authenticated
  using (not hidden or author_id = (select auth.uid()));

create table public.story_reports (
  story_id    uuid not null references public.stories (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text check (reason is null or char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  primary key (story_id, reporter_id)
);
alter table public.story_reports enable row level security;
-- Sem policies: nenhum cliente lê ou escreve denúncias; só o servidor (service_role).
