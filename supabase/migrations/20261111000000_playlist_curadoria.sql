-- radioOn — curadoria de playlists (aditiva): ocultar e destacar faixas.
-- Anuláveis (null = falso). Escrita só pelo servidor, depois de checar o dono da playlist.
alter table public.playlist_tracks add column hidden boolean;
alter table public.playlist_tracks add column featured boolean;
