-- radioOn — schema inicial (ciclo 0)
-- Regras: RLS em todas as tabelas; pontos/escutas escritos só pelo servidor
-- (service_role); points_ledger append-only.

-- =========================================================================
-- Enums
-- =========================================================================
create type public.user_role as enum ('listener', 'artist', 'curator');
create type public.track_status as enum ('processing', 'published', 'removed');

-- =========================================================================
-- Tabelas
-- =========================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'listener',
  display_name text check (char_length(display_name) between 1 and 80),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.tracks (
  id               uuid primary key default gen_random_uuid(),
  artist_id        uuid not null references public.profiles (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  r2_key           text not null unique,
  duration_sec     integer check (duration_sec > 0),
  isrc             text check (isrc is null or isrc ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),
  status           public.track_status not null default 'processing',
  rights_confirmed boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint tracks_published_requires_rights
    check (status <> 'published' or rights_confirmed)
);

create table public.playlists (
  id         uuid primary key default gen_random_uuid(),
  curator_id uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  is_public  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id    uuid not null references public.tracks (id) on delete cascade,
  position    integer not null check (position >= 0),
  added_at    timestamptz not null default now(),
  primary key (playlist_id, track_id),
  constraint playlist_tracks_position_unique
    unique (playlist_id, position) deferrable initially deferred
);

create table public.listen_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  track_id         uuid not null references public.tracks (id) on delete cascade,
  started_at       timestamptz not null default now(),
  seconds_listened integer not null default 0 check (seconds_listened >= 0),
  is_valid         boolean not null default false
);

create table public.points_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete restrict,
  amount     integer not null check (amount <> 0),
  reason     text not null check (char_length(reason) between 1 and 64),
  ref_id     uuid,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Índices
-- =========================================================================
create index tracks_artist_id_idx        on public.tracks (artist_id);
create index tracks_published_idx        on public.tracks (created_at desc) where status = 'published';
create index playlists_curator_id_idx    on public.playlists (curator_id);
create index playlists_public_idx        on public.playlists (created_at desc) where is_public;
create index playlist_tracks_track_idx   on public.playlist_tracks (track_id);
create index listen_events_user_day_idx  on public.listen_events (user_id, started_at desc);
create index listen_events_user_track_idx on public.listen_events (user_id, track_id, started_at desc);
create index listen_events_track_idx     on public.listen_events (track_id);
create index points_ledger_user_idx      on public.points_ledger (user_id, created_at desc);
-- Idempotência: a mesma origem não pode gerar pontos duas vezes pelo mesmo motivo.
create unique index points_ledger_ref_unique
  on public.points_ledger (user_id, reason, ref_id) where ref_id is not null;

-- =========================================================================
-- Funções e triggers
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger tracks_set_updated_at    before update on public.tracks
  for each row execute function public.set_updated_at();
create trigger playlists_set_updated_at before update on public.playlists
  for each row execute function public.set_updated_at();

-- Cria o profile (listener) automaticamente para cada novo usuário.
-- O papel nunca vem do cliente: troca de role é feita só pelo servidor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Papel do usuário autenticado (usado nas policies).
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- points_ledger é append-only: bloqueia UPDATE/DELETE para qualquer papel.
create or replace function public.points_ledger_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'points_ledger é append-only (% bloqueado)', tg_op;
end;
$$;

create trigger points_ledger_no_update_delete
  before update or delete on public.points_ledger
  for each row execute function public.points_ledger_append_only();

create trigger points_ledger_no_truncate
  before truncate on public.points_ledger
  for each statement execute function public.points_ledger_append_only();

-- =========================================================================
-- Privilégios (defesa em profundidade além do RLS)
-- =========================================================================
revoke all on public.profiles, public.tracks, public.playlists, public.playlist_tracks,
  public.listen_events, public.points_ledger from anon, authenticated;

grant select on public.profiles, public.tracks, public.playlists, public.playlist_tracks
  to anon, authenticated;
-- Usuário só pode alterar o próprio display_name (role é exclusivo do servidor).
grant update (display_name) on public.profiles to authenticated;
-- Curadores gerenciam as próprias playlists.
grant insert, update, delete on public.playlists to authenticated;
grant insert, delete on public.playlist_tracks to authenticated;
grant update (position) on public.playlist_tracks to authenticated;
-- Escutas e pontos: leitura própria; escrita só via service_role no servidor.
grant select on public.listen_events, public.points_ledger to authenticated;

grant all on all tables in schema public to service_role;
revoke update, delete, truncate on public.points_ledger from service_role;

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.profiles        enable row level security;
alter table public.tracks          enable row level security;
alter table public.playlists       enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.listen_events   enable row level security;
alter table public.points_ledger   enable row level security;

-- profiles ---------------------------------------------------------------
create policy "profiles: leitura pública"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles: dono atualiza o próprio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- tracks -----------------------------------------------------------------
-- Escrita (upload, publicação, remoção) somente via servidor (service_role).
create policy "tracks: publicadas são públicas"
  on public.tracks for select
  to anon, authenticated
  using (status = 'published');

create policy "tracks: artista vê as próprias"
  on public.tracks for select
  to authenticated
  using (artist_id = (select auth.uid()));

-- playlists --------------------------------------------------------------
create policy "playlists: públicas ou próprias"
  on public.playlists for select
  to anon, authenticated
  using (is_public or curator_id = (select auth.uid()));

create policy "playlists: curador cria"
  on public.playlists for insert
  to authenticated
  with check (
    curator_id = (select auth.uid())
    and (select public.current_user_role()) = 'curator'
  );

create policy "playlists: curador edita as próprias"
  on public.playlists for update
  to authenticated
  using (curator_id = (select auth.uid()))
  with check (curator_id = (select auth.uid()));

create policy "playlists: curador apaga as próprias"
  on public.playlists for delete
  to authenticated
  using (curator_id = (select auth.uid()));

-- playlist_tracks --------------------------------------------------------
create policy "playlist_tracks: visível se a playlist for visível"
  on public.playlist_tracks for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (p.is_public or p.curator_id = (select auth.uid()))
    )
  );

create policy "playlist_tracks: curador adiciona faixas publicadas"
  on public.playlist_tracks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.curator_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tracks t
      where t.id = track_id and t.status = 'published'
    )
  );

create policy "playlist_tracks: curador reordena"
  on public.playlist_tracks for update
  to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.curator_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.curator_id = (select auth.uid())
    )
  );

create policy "playlist_tracks: curador remove"
  on public.playlist_tracks for delete
  to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.curator_id = (select auth.uid())
    )
  );

-- listen_events ----------------------------------------------------------
-- Criação/validação apenas pelo servidor (heartbeats) via service_role.
create policy "listen_events: usuário vê as próprias"
  on public.listen_events for select
  to authenticated
  using (user_id = (select auth.uid()));

-- points_ledger ----------------------------------------------------------
-- Inserção apenas pelo servidor via service_role; nunca update/delete.
create policy "points_ledger: usuário vê o próprio extrato"
  on public.points_ledger for select
  to authenticated
  using (user_id = (select auth.uid()));
