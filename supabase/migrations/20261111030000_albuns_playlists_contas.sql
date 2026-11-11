-- radioOn — Álbum/EP e playlists para qualquer conta (aditiva).

-- Qualquer conta (não anônima) cria playlists próprias. A policy RESTRICTIVE do item s já nega
-- escrita a anônimos (AND com esta permissiva); a de curador continua valendo em paralelo (OR).
create policy "playlists: conta cria a própria"
  on public.playlists for insert
  to authenticated
  with check (curator_id = (select auth.uid()));

-- Álbuns e EPs: uma capa única e N faixas. Escrita só pelo servidor (service_role), após checar
-- o papel de artista; leitura pública. Faixas avulsas seguem sem álbum (single).
create table public.albums (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  kind       text not null default 'album' check (kind in ('album', 'ep')),
  created_at timestamptz not null default now()
);
create index albums_artist_idx on public.albums (artist_id);
create index albums_created_idx on public.albums (created_at desc);
alter table public.albums enable row level security;

create policy "albums: leitura pública"
  on public.albums for select
  to anon, authenticated
  using (true);

alter table public.tracks add column album_id uuid references public.albums (id);
alter table public.tracks add column track_no smallint check (track_no is null or track_no between 1 and 99);
create index tracks_album_idx on public.tracks (album_id);
