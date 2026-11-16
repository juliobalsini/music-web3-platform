-- radioOn — Tema da semana (issue #122, fase 2, item 3) — aditiva.
-- O tema de cada semana ISO é definido pela conta oficial no código (lib/playlists/tema.ts, por PR).
-- A playlist guarda só a semana do tema em que foi marcada ("2026-47"). O dono marca/desmarca com o
-- grant de update que já existe na tabela; o trigger garante no banco que só se marca a semana atual
-- (ninguém marca uma semana passada para entrar no destaque da semana seguinte).

alter table public.playlists add column tema_semana text check (tema_semana is null or tema_semana ~ '^[0-9]{4}-[0-9]{2}$');

create function public.playlists_tema_semana_atual() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tema_semana is not null
     and (tg_op = 'INSERT' or new.tema_semana is distinct from old.tema_semana)
     and new.tema_semana <> to_char(now() at time zone 'utc', 'IYYY-IW') then
    raise exception 'só dá para marcar o tema da semana atual' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger playlists_tema_semana_atual
  before insert or update of tema_semana on public.playlists
  for each row execute function public.playlists_tema_semana_atual();

create index playlists_tema_semana_idx on public.playlists (tema_semana) where tema_semana is not null;
