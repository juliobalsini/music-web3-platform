"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { PlayerCheio } from "@/components/player-cheio";
import { capaGerada, type FaixaListada } from "@/lib/radio/rules";
import { salvarPosicao } from "@/lib/radio/continuar-local";
import { createUrlCache } from "@/lib/player/url-cache";
import { criarGanho } from "@/lib/player/ganho";

export type FaixaTocavel = FaixaListada;
export type EstadoPlayer = "parado" | "carregando" | "tocando" | "erro" | "limite";
export type TipoReacao = "like" | "save" | "support";

type Acoes = {
  atual: FaixaTocavel | null;
  estado: EstadoPlayer;
  fila: FaixaTocavel[];
  /** `continuo`: ao fim da fila volta ao começo (Rádio radioOn), sem repetir a mesma faixa em sequência. */
  tocar: (faixa: FaixaTocavel, fila?: FaixaTocavel[], continuo?: boolean, inicio?: number) => void;
  /** Id do usuário (conta ou visitante anônimo) quando há sessão; serve para saber se a faixa é dele. */
  usuarioId: string | null;
  alternar: () => void;
  proxima: () => void;
  anterior: () => void;
  buscar: (segundos: number) => void;
  aberto: boolean;
  abrir: (v: boolean) => void;
  reacoes: Record<TipoReacao, Set<string>>;
  /** Alterna uma reação; devolve false se precisar de login. */
  reagir: (tipo: TipoReacao, faixaId: string) => Promise<"ok" | "login" | "erro">;
};
type Tempo = { atual: number; duracao: number };

const AcoesCtx = createContext<Acoes | null>(null);
const TempoCtx = createContext<Tempo>({ atual: 0, duracao: 0 });

export function usePlayer(): Acoes {
  const c = useContext(AcoesCtx);
  if (!c) throw new Error("usePlayer fora do PlayerProvider");
  return c;
}
export const useTempo = () => useContext(TempoCtx);

const lufsPorFaixa = new Map<string, number | null>();
const BASE_PROXY = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.trim().replace(/\/+$/, "");
const ehProxy = (url: string) => !!BASE_PROXY && url.startsWith(`${BASE_PROXY}/`);

// Cota diária do B2: uma URL assinada por faixa, reusada (decisão 22 do DECISIONS.md).
const cache = createUrlCache(async (id) => {
  const r = await fetch(`/api/tracks/${id}/play`);
  if (!r.ok) throw new Error(String(r.status));
  const j = (await r.json()) as { url: string; expiresAt: number; loudnessLufs?: number | null };
  lufsPorFaixa.set(id, j.loudnessLufs ?? null);
  return { url: j.url, expiresAt: j.expiresAt };
});

const vazio = (): Record<TipoReacao, Set<string>> => ({ like: new Set(), save: new Set(), support: new Set() });

/**
 * Player único e persistente (vive no layout): um <audio> com preload="none", sem pré-busca da
 * próxima faixa, no máx. 1 nova tentativa em erro do bucket. Heartbeat de escuta a cada 10 s.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const ganho = useRef<ReturnType<typeof criarGanho> | null>(null);
  const carregada = useRef<string | null>(null);
  const tentou = useRef(false);
  const evento = useRef<string | null>(null);
  const logado = useRef(true);
  const continuo = useRef(false);
  const inicio = useRef(0);
  const salvoEm = useRef(0);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [atual, setAtual] = useState<FaixaTocavel | null>(null);
  const [fila, setFila] = useState<FaixaTocavel[]>([]);
  const [estado, setEstado] = useState<EstadoPlayer>("parado");
  const [tempo, setTempo] = useState<Tempo>({ atual: 0, duracao: 0 });
  const [aberto, abrir] = useState(false);
  const [reacoes, setReacoes] = useState(vazio);
  const reacoesRef = useRef(reacoes);
  const refs = useRef({ atual, fila });
  useEffect(() => {
    refs.current = { atual, fila };
    reacoesRef.current = reacoes;
  });

  // Reações do usuário (uma leitura; 401 = deslogado, segue vazio).
  useEffect(() => {
    let vivo = true;
    fetch("/api/reacoes")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { like: string[]; save: string[]; support: string[]; userId?: string } | null) => {
        if (vivo && j?.userId) setUsuarioId(j.userId);
        if (vivo && j) setReacoes({ like: new Set(j.like), save: new Set(j.save), support: new Set(j.support) });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Cor ambiente da faixa atual (base marinho + âmbar mantidos pelo CSS).
  useEffect(() => {
    document.body.style.setProperty("--ambiente", atual ? capaGerada(atual.title).cor : "#e89a3c");
  }, [atual]);

  // Heartbeat só enquanto toca. O servidor mede e valida; aqui apenas avisamos.
  const atualId = atual?.id;
  useEffect(() => {
    if (estado !== "tocando" || !atualId || !logado.current) return;
    const post = (url: string, corpo: object) =>
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const batida = async () => {
      try {
        if (!evento.current) {
          const r = await post("/api/listen/start", { trackId: atualId });
          if (r.status === 401) logado.current = false;
          if (r.ok) evento.current = ((await r.json()) as { eventId: string }).eventId;
          return;
        }
        const r = await post("/api/listen/beat", { eventId: evento.current });
        if (r.status === 401) logado.current = false;
        if (r.status === 404) evento.current = null;
      } catch {
        /* escuta não pontua, o áudio segue */
      }
    };
    void batida();
    const t = setInterval(() => void batida(), 10_000);
    return () => {
      clearInterval(t);
      evento.current = null; // pausa encerra o evento
    };
  }, [estado, atualId]);

  const carregarETocar = useCallback(async (id: string, forcar = false) => {
    const el = audio.current;
    if (!el) return;
    try {
      if (carregada.current !== id || forcar) {
        setEstado("carregando");
        const url = await cache.get(id, forcar);
        ganho.current ??= criarGanho(el);
        ganho.current.preparar(url, ehProxy(url));
        ganho.current.aplicar(lufsPorFaixa.get(id), ehProxy(url));
        el.src = url;
        carregada.current = id;
      }
      // Retomada: com metadados já carregados o ponto vale agora; senão, em onLoadedMetadata.
      if (inicio.current > 0 && el.readyState >= 1) {
        el.currentTime = inicio.current;
        inicio.current = 0;
      }
      await el.play();
    } catch {
      setEstado("erro");
    }
  }, []);

  // Ajustes › Normalizar volume: reaplica o ganho na faixa atual.
  useEffect(() => {
    const reaplicar = () => {
      const id = carregada.current;
      if (id && ganho.current && audio.current?.src) ganho.current.aplicar(lufsPorFaixa.get(id), ehProxy(audio.current.src));
    };
    window.addEventListener("radioon:normalizar", reaplicar);
    return () => window.removeEventListener("radioon:normalizar", reaplicar);
  }, []);

  // Guarda o ponto exato da faixa atual (Continue ouvindo). Chamado a cada ~5 s, na pausa e ao sair.
  const guardarPonto = useCallback((fim = false) => {
    const el = audio.current;
    const a = refs.current.atual;
    if (!el || !a || carregada.current !== a.id) return;
    if (!fim && el.currentTime < 1) return;
    const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : (a.durationSec ?? 0);
    salvarPosicao(a, fim ? 0 : el.currentTime, dur);
    salvoEm.current = el.currentTime;
  }, []);
  useEffect(() => {
    const sair = () => guardarPonto();
    window.addEventListener("pagehide", sair);
    return () => window.removeEventListener("pagehide", sair);
  }, [guardarPonto]);

  const tocar = useCallback(
    (faixa: FaixaTocavel, novaFila?: FaixaTocavel[], seguido = false, desde = 0) => {
      const el = audio.current;
      if (refs.current.atual?.id === faixa.id && el && carregada.current === faixa.id) {
        if (desde > 0) el.currentTime = desde;
        if (el.paused) void el.play().catch(() => setEstado("erro"));
        else if (desde <= 0) el.pause();
        return;
      }
      tentou.current = false;
      inicio.current = desde;
      setAtual(faixa);
      if (novaFila) {
        setFila(novaFila);
        continuo.current = seguido;
      }
      setTempo({ atual: 0, duracao: faixa.durationSec ?? 0 });
      void carregarETocar(faixa.id);
    },
    [carregarETocar],
  );

  const alternar = useCallback(() => {
    const el = audio.current;
    const { atual: a } = refs.current;
    if (!el || !a) return;
    if (!el.paused) el.pause();
    else {
      tentou.current = false;
      void carregarETocar(a.id);
    }
  }, [carregarETocar]);

  const vizinha = useCallback(
    (passo: 1 | -1) => {
      const { atual: a, fila: f } = refs.current;
      if (!a) return false;
      const i = f.findIndex((x) => x.id === a.id);
      let prox = i >= 0 ? f[i + passo] : undefined;
      // Rádio contínua: depois da última volta à primeira (nunca a mesma faixa em sequência).
      if (!prox && passo === 1 && continuo.current && f.length > 1) prox = f[0];
      if (!prox || prox.id === a.id) return false;
      tocar(prox);
      return true;
    },
    [tocar],
  );
  const proxima = useCallback(() => void vizinha(1), [vizinha]);
  const anterior = useCallback(() => {
    const el = audio.current;
    if (el && el.currentTime > 3) el.currentTime = 0;
    else void vizinha(-1);
  }, [vizinha]);

  const buscar = useCallback((s: number) => {
    const el = audio.current;
    if (el && Number.isFinite(s)) el.currentTime = Math.max(0, s);
  }, []);

  const reagir = useCallback<Acoes["reagir"]>(async (tipo, faixaId) => {
    const ligada = !reacoesRef.current[tipo].has(faixaId);
    try {
      const r = await fetch(`/api/tracks/${faixaId}/reacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: tipo, on: ligada }),
      });
      if (r.status === 401) return "login";
      if (!r.ok) return "erro";
      setReacoes((prev) => {
        const s = new Set(prev[tipo]);
        if (ligada) s.add(faixaId);
        else s.delete(faixaId);
        return { ...prev, [tipo]: s };
      });
      return "ok";
    } catch {
      return "erro";
    }
  }, []);

  // Tela de bloqueio / fones: título, artista e controles.
  useEffect(() => {
    if (!atual || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: atual.title, artist: atual.artistName });
    navigator.mediaSession.setActionHandler("play", alternar);
    navigator.mediaSession.setActionHandler("pause", alternar);
    navigator.mediaSession.setActionHandler("nexttrack", proxima);
    navigator.mediaSession.setActionHandler("previoustrack", anterior);
  }, [atual, alternar, proxima, anterior]);

  function aoErrar() {
    // 403/429 do bucket: uma nova tentativa com URL nova; depois, aviso de limite.
    const a = refs.current.atual;
    if (!a) return;
    if (!tentou.current) {
      tentou.current = true;
      void carregarETocar(a.id, true);
    } else setEstado("limite");
  }

  const acoes = useMemo<Acoes>(
    () => ({ atual, estado, fila, tocar, usuarioId, alternar, proxima, anterior, buscar, aberto, abrir, reacoes, reagir }),
    [atual, estado, fila, tocar, usuarioId, alternar, proxima, anterior, buscar, aberto, reacoes, reagir],
  );

  return (
    <AcoesCtx.Provider value={acoes}>
      <TempoCtx.Provider value={tempo}>
        {children}
        <PlayerCheio />
      </TempoCtx.Provider>
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setEstado("tocando")}
        onPause={() => {
          setEstado((e) => (e === "tocando" ? "parado" : e));
          if (!audio.current?.ended) guardarPonto();
        }}
        onTimeUpdate={(e) => {
          // Ler antes: dentro do updater o currentTarget já é null e derrubava a página ao tocar.
          const agora = e.currentTarget.currentTime;
          if (Math.abs(agora - salvoEm.current) >= 5) guardarPonto();
          setTempo((t) => ({ ...t, atual: agora }));
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setTempo((t) => ({ ...t, duracao: d }));
          if (inicio.current > 0) {
            e.currentTarget.currentTime = inicio.current;
            inicio.current = 0;
          }
        }}
        onEnded={() => {
          guardarPonto(true);
          evento.current = null;
          setEstado("parado");
          if (!vizinha(1)) setTempo((t) => ({ ...t, atual: 0 }));
        }}
        onError={aoErrar}
      />
    </AcoesCtx.Provider>
  );
}
