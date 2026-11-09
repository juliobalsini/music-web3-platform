"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { createUrlCache } from "@/lib/player/url-cache";

type Estado = "parado" | "carregando" | "tocando" | "erro" | "limite";

const cache = createUrlCache(async (id) => {
  const r = await fetch(`/api/tracks/${id}/play`);
  if (!r.ok) throw new Error(String(r.status));
  const j = (await r.json()) as { url: string; expiresAt: number };
  return { url: j.url, expiresAt: j.expiresAt };
});

/**
 * Player econômico: um único <audio> com preload="none", sem pré-busca,
 * URL assinada reaproveitada e no máx. 1 nova tentativa em erro do bucket.
 */
export function Player({ trackId, title, grande = false }: { trackId: string; title: string; grande?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const atual = useRef<string | null>(null);
  const tentou = useRef(false);
  const [estado, setEstado] = useState<Estado>("parado");
  const evento = useRef<string | null>(null);
  const logado = useRef(true);

  // Heartbeat a cada 10 s só enquanto toca. O servidor mede o tempo e valida;
  // aqui apenas avisamos. Sem login (401) ou erro: para em silêncio.
  useEffect(() => {
    if (estado !== "tocando" || !logado.current) return;
    const post = (url: string, corpo: object) =>
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const batida = async () => {
      try {
        if (!evento.current) {
          const r = await post("/api/listen/start", { trackId });
          if (r.status === 401) logado.current = false;
          if (r.ok) evento.current = ((await r.json()) as { eventId: string }).eventId;
          return;
        }
        const r = await post("/api/listen/beat", { eventId: evento.current });
        if (r.status === 401) logado.current = false;
        if (r.status === 404) evento.current = null;
      } catch {
        /* ignora: escuta não pontua, o áudio segue */
      }
    };
    void batida();
    const t = setInterval(() => void batida(), 10_000);
    return () => {
      clearInterval(t);
      evento.current = null; // pausa encerra o evento: retomar abre outro (sem contar a pausa)
    };
  }, [estado, trackId]);

  async function tocar(forcar = false) {
    const el = audio.current;
    if (!el) return;
    try {
      if (atual.current !== trackId || forcar) {
        setEstado("carregando");
        el.src = await cache.get(trackId, forcar);
        atual.current = trackId;
      }
      await el.play();
    } catch {
      setEstado("erro");
    }
  }

  function alternar() {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) el.pause();
    else {
      tentou.current = false;
      void tocar();
    }
  }

  function aoErrar() {
    // 403/429 do bucket: uma nova tentativa com URL nova; depois, aviso.
    if (!tentou.current) {
      tentou.current = true;
      void tocar(true).catch(() => setEstado("limite"));
    } else setEstado("limite");
  }

  const tocando = estado === "tocando";
  return (
    <div className={grande ? "flex flex-col items-center gap-5" : "flex items-center gap-4"}>
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? `Pausar ${title}` : `Tocar ${title}`}
        data-testid={grande ? "play" : undefined}
        className={`flex ${grande ? "size-28" : "size-14"} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 shadow-[0_8px_24px_-8px_#ff6b35] transition-transform duration-200 ease-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60`}
        disabled={estado === "carregando"}
      >
        {tocando ? (
          <Pause className={`${grande ? "size-12" : "size-6"} fill-white text-white`} strokeWidth={0} />
        ) : (
          <Play className={`ml-0.5 ${grande ? "size-12" : "size-6"} fill-white text-white`} strokeWidth={0} />
        )}
      </button>
      <div className={grande ? "min-w-0 text-center" : "min-w-0 text-left"}>
        <p className="truncate font-medium">{title}</p>
        {estado === "limite" && (
          <p role="status" className="text-sm text-brand-2">limite diário atingido</p>
        )}
        {estado === "erro" && (
          <p role="status" className="text-sm text-brand-2">não foi possível tocar</p>
        )}
      </div>
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setEstado("tocando")}
        onPause={() => setEstado((e) => (e === "tocando" ? "parado" : e))}
        onEnded={() => {
          evento.current = null;
          setEstado("parado");
        }}
        onError={aoErrar}
      />
    </div>
  );
}
