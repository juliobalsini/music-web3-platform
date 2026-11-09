-- radioOn — ciclo 4: heartbeats de escuta e validação no Postgres.
-- Chamadas só pelo servidor (service_role). As funções NÃO são SECURITY DEFINER:
-- anon/authenticated não têm privilégio nas tabelas e, por garantia, o corpo
-- confere o papel do JWT.

alter table public.listen_events add column last_beat_at timestamptz;

-- Abre um evento de escuta para uma faixa publicada. Devolve o id do evento.
create function public.listen_start(p_user uuid, p_track uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'acesso negado';
  end if;
  if not exists (select 1 from public.tracks t where t.id = p_track and t.status = 'published') then
    return null;
  end if;
  insert into public.listen_events (user_id, track_id, last_beat_at)
  values (p_user, p_track, now())
  returning id into v_id;
  return v_id;
end;
$$;

-- Processa um heartbeat. O tempo é medido pelo relógio do servidor (nunca pelo
-- cliente): intervalo < 5 s é ignorado, > 20 s quebra a continuidade (zera).
-- Valida com >= 30 s contínuos, no máx. p_max_per_track vezes/dia por faixa,
-- até p_daily_limit pontos/dia, e nunca na faixa do próprio artista.
create function public.listen_beat(
  p_user uuid,
  p_event uuid,
  p_points integer,
  p_daily_limit integer,
  p_max_per_track integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  e public.listen_events%rowtype;
  v_gap numeric;
  v_secs integer;
  v_artist uuid;
  v_day_start timestamptz;
  v_same integer;
  v_today integer;
  v_motivo text := null;
  v_awarded integer := 0;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'acesso negado';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user::text));

  select * into e from public.listen_events where id = p_event and user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'evento');
  end if;

  v_gap := extract(epoch from (now() - coalesce(e.last_beat_at, e.started_at)));
  if v_gap < 5 then
    return jsonb_build_object('ok', true, 'seconds', e.seconds_listened, 'valid', e.is_valid, 'points', 0);
  end if;

  if v_gap > 20 then
    v_secs := case when e.is_valid then e.seconds_listened else 0 end;
  else
    v_secs := e.seconds_listened + floor(v_gap)::integer;
  end if;

  update public.listen_events
    set seconds_listened = v_secs, last_beat_at = now()
    where id = e.id;

  if not e.is_valid and v_secs >= 30 then
    select t.artist_id into v_artist
      from public.tracks t where t.id = e.track_id and t.status = 'published';
    v_day_start := date_trunc('day', now() at time zone 'utc') at time zone 'utc';

    if v_artist is null or v_artist = p_user then
      v_motivo := 'faixa';
    else
      select count(*) into v_same from public.listen_events
        where user_id = p_user and track_id = e.track_id and is_valid and started_at >= v_day_start;
      select coalesce(sum(amount), 0) into v_today from public.points_ledger
        where user_id = p_user and reason = 'listen' and created_at >= v_day_start;
      if v_same >= p_max_per_track then
        v_motivo := 'limite_faixa';
      elsif v_today + p_points > p_daily_limit then
        v_motivo := 'limite_diario';
      end if;
    end if;

    if v_motivo is null then
      update public.listen_events set is_valid = true where id = e.id;
      insert into public.points_ledger (user_id, amount, reason, ref_id)
        values (p_user, p_points, 'listen', e.id)
        on conflict do nothing;
      v_awarded := p_points;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'seconds', v_secs,
    'valid', e.is_valid or v_awarded > 0,
    'points', v_awarded,
    'motivo', v_motivo
  );
end;
$$;
