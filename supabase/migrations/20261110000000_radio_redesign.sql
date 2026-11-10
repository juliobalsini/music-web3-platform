-- radioOn — redesenho mobile-first (aditiva): capa e ficha técnica das faixas,
-- nota do playlister, reações (curtir/salvar/apoiar) e programação por horário.

-- Capa (chave no bucket) e ficha técnica opcionais.
alter table public.tracks add column cover_key text check (cover_key is null or char_length(cover_key) <= 300);
alter table public.tracks add column composer text check (composer is null or char_length(composer) <= 120);
alter table public.tracks add column performers text check (performers is null or char_length(performers) <= 200);
alter table public.tracks add column album text check (album is null or char_length(album) <= 120);
alter table public.tracks add column label text check (label is null or char_length(label) <= 120);

-- Nota curta do playlister sobre a faixa naquela playlist (editável pelo curador dono, via RLS existente).
alter table public.playlist_tracks add column note text check (note is null or char_length(note) <= 280);

-- Reações do usuário a faixas. Escrita só pelo servidor (service_role); cada um lê as próprias.
create table public.track_reactions (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  track_id   uuid not null references public.tracks (id) on delete cascade,
  kind       text not null check (kind in ('like', 'save', 'support')),
  created_at timestamptz not null default now(),
  primary key (user_id, track_id, kind)
);
create index track_reactions_track_idx on public.track_reactions (track_id, kind);
alter table public.track_reactions enable row level security;

create policy "track_reactions: usuário vê as próprias"
  on public.track_reactions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Programação: blocos curados por horário (hora cheia, fuso de Brasília na leitura).
create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  curator_id  uuid not null references public.profiles (id) on delete cascade,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  start_hour  smallint not null check (start_hour between 0 and 23),
  end_hour    smallint not null check (end_hour between 1 and 24 and end_hour > start_hour),
  created_at  timestamptz not null default now()
);
create index programs_hours_idx on public.programs (start_hour);
alter table public.programs enable row level security;

create policy "programs: leitura pública"
  on public.programs for select
  to anon, authenticated
  using (true);

create policy "programs: curador cria os próprios"
  on public.programs for insert
  to authenticated
  with check (
    curator_id = (select auth.uid())
    and exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.curator_id = (select auth.uid()) and p.is_public
    )
  );

create policy "programs: curador apaga os próprios"
  on public.programs for delete
  to authenticated
  using (curator_id = (select auth.uid()));

-- Índice para "ouvindo agora" (heartbeats recentes).
create index listen_events_last_beat_idx on public.listen_events (last_beat_at);
