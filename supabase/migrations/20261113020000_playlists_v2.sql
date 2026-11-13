-- radioOn — Playlists v2, fatia 1 (aditiva): rascunho privado, descrição, capa própria, criação idempotente e salvamentos.
-- Rascunho = is_public false + published_at nulo (a policy existente já o mostra só ao dono).

alter table public.playlists add column description  text check (description is null or char_length(description) <= 500);
alter table public.playlists add column published_at timestamptz;
alter table public.playlists add column cover_path   text;
-- Chave gerada no navegador a cada abertura do formulário: toque repetido reaproveita a mesma playlist.
alter table public.playlists add column create_key   text check (create_key is null or char_length(create_key) <= 64);

create unique index playlists_create_key_idx on public.playlists (curator_id, create_key) where create_key is not null;

create table public.playlist_saves (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (playlist_id, user_id)
);
create index playlist_saves_user_idx on public.playlist_saves (user_id, created_at desc);
alter table public.playlist_saves enable row level security;

-- Cada conta enxerga só os próprios salvamentos; contadores públicos são calculados no servidor (sem expor quem salvou).
create policy "playlist_saves: vê os próprios"
  on public.playlist_saves for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "playlist_saves: salva como si mesmo"
  on public.playlist_saves for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "playlist_saves: remove o próprio"
  on public.playlist_saves for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Anônimo nunca salva (mesma regra das demais escritas).
create policy "playlist_saves: anônimo não escreve (insert)"
  on public.playlist_saves as restrictive for insert
  to authenticated
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "playlist_saves: anônimo não escreve (delete)"
  on public.playlist_saves as restrictive for delete
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');
