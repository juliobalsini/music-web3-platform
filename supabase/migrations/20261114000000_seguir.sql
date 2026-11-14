-- radioOn — Navegação e conta v2, item 4 (aditiva): seguir perfis.
-- Só conta de verdade segue (sessão anônima nunca); cada um vê quem segue e quem o segue.
-- Contagens públicas de seguidores, se vierem, passam pelo servidor.

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index follows_followed_idx on public.follows (followed_id, created_at desc);
alter table public.follows enable row level security;

create policy "follows: vê quem segue e quem o segue"
  on public.follows for select
  to authenticated
  using (follower_id = (select auth.uid()) or followed_id = (select auth.uid()));

create policy "follows: segue só como si mesmo"
  on public.follows for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

create policy "follows: deixa de seguir só o próprio"
  on public.follows for delete
  to authenticated
  using (follower_id = (select auth.uid()));

-- Sessão anônima não segue (a restritiva vale sobre a permissiva acima).
create policy "follows: anônimo não segue"
  on public.follows as restrictive for insert
  to authenticated
  with check (coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true');
