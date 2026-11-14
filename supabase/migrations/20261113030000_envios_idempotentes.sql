-- radioOn — envios idempotentes (aditiva): chave de envio por faixa (toque repetido/nova tentativa não duplica),
-- motivo de falha e estado terminal "failed". Nada é apagado; faixas travadas são reconciliadas pelo servidor.
alter type public.track_status add value if not exists 'failed' after 'removed';

alter table public.tracks add column if not exists upload_key text check (upload_key is null or char_length(upload_key) <= 64);
alter table public.tracks add column if not exists failure_reason text check (failure_reason is null or char_length(failure_reason) <= 300);
create unique index if not exists tracks_upload_key_idx on public.tracks (artist_id, upload_key) where upload_key is not null;
