-- radioOn — Stories v2, fase 1 (aditiva): visualizações por usuário ou sessão anônima e "apagar" sem DELETE.
-- Visitante anônimo (Anonymous Sign-Ins) usa o papel `authenticated` com is_anonymous = true no JWT;
-- ele pode registrar a PRÓPRIA visualização e só enxerga as próprias. O dono do story vê as do seu story.

create table public.story_views (
  story_id   uuid not null references public.stories (id) on delete cascade,
  viewer_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);
create index story_views_viewer_idx on public.story_views (viewer_id, created_at desc);
alter table public.story_views enable row level security;

create policy "story_views: vê as próprias ou as do próprio story"
  on public.story_views for select
  to authenticated
  using (
    viewer_id = (select auth.uid())
    or exists (select 1 from public.stories s where s.id = story_id and s.author_id = (select auth.uid()))
  );

create policy "story_views: registra só a própria"
  on public.story_views for insert
  to authenticated
  with check (viewer_id = (select auth.uid()));

-- "Apagar" do dono: marca a data (sem DELETE; o servidor confere a autoria antes). Some para todos, inclusive o dono.
alter table public.stories add column deleted_at timestamptz;

create policy "stories: apagados não aparecem"
  on public.stories as restrictive for select
  to anon, authenticated
  using (deleted_at is null);
