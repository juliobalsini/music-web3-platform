-- radioOn — Navegação e conta v2, item 7 (aditiva): exclusão lógica de faixas, álbuns/EPs e playlists.
-- "Apagar" marca deleted_at (sem DELETE; o servidor confere a autoria antes e grava com service_role).
-- O conteúdo some na hora para todos (inclusive o dono nas leituras comuns); o dono desfaz por 30 dias
-- pela central Meus envios, que lê os apagados no servidor. Stories já têm deleted_at (20261113000000).
-- Remoção física dos arquivos no B2 é pós-beta (PLANO.md; exige aprovação e trava de escrita destrutiva).

alter table public.tracks add column deleted_at timestamptz;
alter table public.albums add column deleted_at timestamptz;
alter table public.playlists add column deleted_at timestamptz;

create index tracks_apagadas_idx on public.tracks (artist_id, deleted_at) where deleted_at is not null;
create index albums_apagados_idx on public.albums (artist_id, deleted_at) where deleted_at is not null;
create index playlists_apagadas_idx on public.playlists (curator_id, deleted_at) where deleted_at is not null;

create policy "tracks: apagadas não aparecem"
  on public.tracks as restrictive for select
  to anon, authenticated
  using (deleted_at is null);

create policy "albums: apagados não aparecem"
  on public.albums as restrictive for select
  to anon, authenticated
  using (deleted_at is null);

create policy "playlists: apagadas não aparecem"
  on public.playlists as restrictive for select
  to anon, authenticated
  using (deleted_at is null);
