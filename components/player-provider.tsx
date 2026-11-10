"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { PlayerCheio } from "@/components/player-cheio";
import { capaGerada, type FaixaListada } from "@/lib/radio/rules";
import { createUrlCache } from "@/lib/player/url-cache";

export type FaixaTocavel = FaixaListada;
export type EstadoPlayer = "parado" | "carregando" | "tocando" | "erro" | "limite";
export type TipoReacao = "like" | "save" | "support";

type Acoes = {
  atual: FaixaTocavel | null;
  estado: EstadoPlayer;
  fila: FaixaTocavel[];
  tocar: (faixa: FaixaTocavel, fila?: FaixaTocavel[]) => void;
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

// Cota diária do B2: uma URL assinada por faixa, reusada (decisão 22 do DECISIONS.md).
const cache = createUrlCache(async (id) => {
  const r = await fetch(`/api/tracks/${id}/play`);
  if (!r.ok) throw new Error(String(r.status));
  const j = (await r.json()) as { url: string; expiresAt: number };
  return { url: j.url, expiresAt: j.expiresAt };
});

const vazio = (): Record<TipoReacao, Set<string>> => ({ like: new Set(), save: new Set(), support: new Set() });

/**
 * Player único e persistente (vive no layout): um <audio> com preload="none", sem pré-busca da
 * próxima faixa, no máx. 1 nova tentativa em erro do bucket. Heartbeat de escuta a cada 10 s.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const carregada = useRef<string | null>(null);
  const tentou = useRef(false);
  const evento = useRef<string | null>(null);
  const logado = useRef(true);
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
      .then((j: { like: string[]; save: string[]; support: string[] } | null) => {
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
        el.src = await cache.get(id, forcar);
        carregada.current = id;
      }
      await el.play();
    } catch {
      setEstado("erro");
    }
  }, []);

  const tocar = useCallback(
    (faixa: FaixaTocavel, novaFila?: FaixaTocavel[]) => {
      const el = audio.current;
      if (refs.current.atual?.id === faixa.id && el && carregada.current === faixa.id) {
        if (el.paused) void el.play().catch(() => setEstado("erro"));
        else el.pause();
        return;
      }
      tentou.current = false;
      setAtual(faixa);
      if (novaFila) setFila(novaFila);
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
      const prox = i >= 0 ? f[i + passo] : undefined;
      if (!prox) return false;
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
    () => ({ atual, estado, fila, tocar, alternar, proxima, anterior, buscar, aberto, abrir, reacoes, reagir }),
    [atual, estado, fila, tocar, alternar, proxima, anterior, buscar, aberto, reacoes, reagir],
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
        onPause={() => setEstado((e) => (e === "tocando" ? "parado" : e))}
        onTimeUpdate={(e) => {
          // Ler antes: dentro do updater o currentTarget já é null e derrubava a página ao tocar.
          const agora = e.currentTarget.currentTime;
          setTempo((t) => ({ ...t, atual: agora }));
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setTempo((t) => ({ ...t, duracao: d }));
        }}
        onEnded={() => {
          evento.current = null;
          setEstado("parado");
          if (!vizinha(1)) setTempo((t) => ({ ...t, atual: 0 }));
        }}
        onError={aoErrar}
      />
    </AcoesCtx.Provider>
  );
}
