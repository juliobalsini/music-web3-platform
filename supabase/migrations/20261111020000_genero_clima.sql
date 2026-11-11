-- radioOn — gênero e clima da faixa (aditiva; colunas opcionais).
-- Gênero: lista fixa validada no app (limite de tamanho aqui). Clima: seis valores fixos.
alter table public.tracks add column genre text check (genre is null or char_length(genre) <= 40);
alter table public.tracks add column mood text check (mood is null or mood in ('madrugada', 'estrada', 'foco', 'chuva', 'pista', 'domingo'));
create index tracks_genre_idx on public.tracks (genre);
create index tracks_mood_idx on public.tracks (mood);
