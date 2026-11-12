-- Entrega de áudio econômica (Fase A): stream transcodificado e loudness medida.
-- Aditiva: só colunas anuláveis. transcode_status nulo = pendente (o backfill é implícito:
-- toda faixa existente tem NULL e o transcodificador trata NULL como 'pending').
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS stream_path text;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS stream_bytes bigint;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS loudness_lufs real;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS transcode_status text;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS transcode_error text;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS transcode_attempts int;
