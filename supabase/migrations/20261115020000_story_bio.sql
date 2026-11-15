-- radioOn — Story de bio automático (issue #156) — aditiva.
-- Frase da bio e foto pública do perfil (usadas no story de bio do artista).
-- Leitura pública como o resto do perfil (grant de select já existe na tabela).
-- Escrita só pelo servidor (service_role): o grant de update do cliente continua só em display_name.

alter table public.profiles add column bio text check (bio is null or char_length(bio) <= 140);
alter table public.profiles add column avatar_url text check (avatar_url is null or avatar_url like 'https://%');
