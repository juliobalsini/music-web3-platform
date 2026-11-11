-- radioOn — auditoria de segurança para visitantes anônimos (aditiva).
-- Anonymous Sign-Ins do Supabase usam o papel `authenticated`, com o claim `is_anonymous = true`
-- no JWT. Estas policies RESTRICTIVE são combinadas com AND às permissivas já existentes:
-- um anônimo nunca escreve em tabela de conteúdo (nem mudando papel, nome, faixas, playlists,
-- itens de playlist, programação), mesmo se uma grant ou policy futura abrir a escrita.
-- Escuta, pontos e reações continuam sendo gravados só pelo servidor (service_role ignora RLS),
-- que aplica o teto diário próprio do anônimo. Quem vira conta (e-mail/Google) mantém o mesmo
-- id e o claim passa a `false`, então passa a escrever normalmente conforme o papel.

create policy "profiles: anônimo não escreve (update)"
  on public.profiles as restrictive for update
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true')
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "tracks: anônimo não escreve (insert)"
  on public.tracks as restrictive for insert
  to authenticated
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "tracks: anônimo não escreve (update)"
  on public.tracks as restrictive for update
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true')
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "tracks: anônimo não escreve (delete)"
  on public.tracks as restrictive for delete
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "playlists: anônimo não escreve (insert)"
  on public.playlists as restrictive for insert
  to authenticated
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "playlists: anônimo não escreve (update)"
  on public.playlists as restrictive for update
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true')
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "playlists: anônimo não escreve (delete)"
  on public.playlists as restrictive for delete
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "playlist_tracks: anônimo não escreve (insert)"
  on public.playlist_tracks as restrictive for insert
  to authenticated
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "playlist_tracks: anônimo não escreve (update)"
  on public.playlist_tracks as restrictive for update
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true')
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "playlist_tracks: anônimo não escreve (delete)"
  on public.playlist_tracks as restrictive for delete
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "programs: anônimo não escreve (insert)"
  on public.programs as restrictive for insert
  to authenticated
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "programs: anônimo não escreve (update)"
  on public.programs as restrictive for update
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true')
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');

create policy "programs: anônimo não escreve (delete)"
  on public.programs as restrictive for delete
  to authenticated
  using (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');
