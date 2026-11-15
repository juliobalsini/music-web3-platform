-- radioOn — Configurações (issue #125 item 5, fatia 1; #116 itens 8 e 11) — aditiva.
-- Preferências da conta (reprodução, dados, privacidade) e exclusão lógica da conta.
-- Escrita só pelo servidor (service_role): nenhuma policy de insert/update/delete para clientes.

create table public.user_settings (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  prefs      jsonb not null default '{}'::jsonb check (jsonb_typeof(prefs) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;

-- Cada conta lê só as próprias preferências (sessão anônima guarda as suas só no aparelho).
create policy "user_settings: dono lê as próprias"
  on public.user_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Conta excluída: anonimizada pelo servidor (nome, e-mail, foto) e todo o conteúdo marcado como apagado.
-- Remoção física (linhas e arquivos no B2) é pós-beta (PLANO.md).
alter table public.profiles add column deleted_at timestamptz;
create index profiles_excluidos_idx on public.profiles (deleted_at) where deleted_at is not null;
