"use client";

import { Bookmark, ChevronDown, Heart, HeartHandshake, Pause, Play, Share2, SkipBack, SkipForward } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Capa } from "@/components/capa";
import { Onda } from "@/components/onda";
import { usePlayer, useTempo, type TipoReacao } from "@/components/player-provider";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Player em tela cheia: <dialog> modal (foco preso, Esc fecha), vinil girando enquanto toca. */
export function PlayerCheio() {
  const { atual, estado, aberto, abrir, alternar, proxima, anterior, reacoes, reagir } = usePlayer();
  const { atual: t, duracao } = useTempo();
  const ref = useRef<HTMLDialogElement>(null);
  const [aviso, setAviso] = useState<{ texto: string; login?: boolean } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  if (!atual) return <dialog ref={ref} aria-label="Player" onClose={() => abrir(false)} />;
  const tocando = estado === "tocando";
  const ficha = [
    ["Compositor", atual.composer],
    ["Intérpretes", atual.performers],
    ["Álbum", atual.album],
    ["Selo", atual.label],
  ].filter((x): x is [string, string] => !!x[1]);

  async function reacao(tipo: TipoReacao) {
    const r = await reagir(tipo, atual!.id);
    if (r === "login") setAviso({ texto: "Entre para usar isto.", login: true });
    else if (r === "erro") setAviso({ texto: "Não deu certo. Tente de novo." });
    else if (tipo === "support" && !reacoes.support.has(atual!.id)) setAviso({ texto: `Você apoia ${atual!.artistName}. Obrigado!` });
    else setAviso(null);
  }

  async function compartilhar() {
    const url = `${location.origin}/faixa/${atual!.id}`;
    const dados: ShareData = { title: atual!.title, text: `${atual!.title} · ${atual!.artistName}`, url };
    try {
      if (navigator.share) {
        // Quando o aparelho aceita arquivos, envia também a imagem da faixa (cartão 1200x630).
        try {
          const r = await fetch(`/api/tracks/${atual!.id}/og`);
          if (r.ok) {
            const arquivo = new File([await r.blob()], `${atual!.title}.png`, { type: "image/png" });
            if (navigator.canShare?.({ files: [arquivo] })) dados.files = [arquivo];
          }
        } catch {
          /* segue só com o link */
        }
        await navigator.share(dados);
      } else {
        await navigator.clipboard.writeText(url);
        setAviso({ texto: "Link copiado." });
      }
    } catch {
      /* cancelado pelo usuário */
    }
  }

  const botaoRodape = (tipo: TipoReacao, rotulo: string, Icone: typeof Heart) => {
    const ligado = reacoes[tipo].has(atual.id);
    return (
      <button
        key={tipo}
        type="button"
        onClick={() => void reacao(tipo)}
        aria-pressed={ligado}
        className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold text-white/80 hover:bg-white/10 aria-pressed:text-brand"
      >
        <Icone className={`size-6 ${ligado ? "fill-brand" : ""}`} aria-hidden="true" />
        {rotulo}
      </button>
    );
  };

  return (
    <dialog
      ref={ref}
      aria-label={`Tocando: ${atual.title}`}
      onClose={() => abrir(false)}
      className="m-0 size-full max-h-none max-w-none overflow-y-auto bg-night-900 text-white backdrop:bg-night-900"
    >
      <div
        className="flex min-h-full flex-col items-center gap-6 px-6 pb-8 pt-4"
        style={{ background: "radial-gradient(120% 60% at 50% 0%, color-mix(in srgb, var(--ambiente) 22%, transparent), transparent 70%)" }}
      >
        <div className="flex w-full max-w-md items-center justify-between">
          <button type="button" onClick={() => abrir(false)} aria-label="Fechar player" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
            <ChevronDown className="size-7" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-white/70">No ar</span>
          <span className="size-11" />
        </div>

        {/* Vinil: borda escura com sulcos, capa grande ao centro; gira só tocando. */}
        <div
          aria-hidden="true"
          data-testid="vinil"
          data-tocando={tocando}
          className="relative aspect-square w-[min(78vw,22rem)] shrink-0 rounded-full shadow-[0_24px_40px_-16px_rgba(0,0,0,0.7)]"
          style={{
            background: "repeating-radial-gradient(circle at center, #0a0f1c 0 2px, #141b2e 2px 4px)",
            animation: "girar 9s linear infinite",
            animationPlayState: tocando ? "running" : "paused",
          }}
        >
          <Capa id={atual.id} title={atual.title} hasCover={atual.hasCover} redonda className="absolute inset-[11%] size-[78%] ring-2 ring-black/40" />
          <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-night-900 ring-2 ring-black/50" />
        </div>

        <div className="flex w-full max-w-md flex-col gap-1 text-center">
          <h2 className="text-balance text-2xl font-bold">{atual.title}</h2>
          <p className="text-white/70">{atual.artistName}</p>
          {estado === "limite" && <p role="status" className="text-sm text-brand-2">Limite diário atingido. Volte amanhã.</p>}
          {estado === "erro" && <p role="status" className="text-sm text-brand-2">Não foi possível tocar. Tente de novo.</p>}
        </div>

        <div className="flex w-full max-w-md flex-col gap-1">
          <Onda id={atual.id} />
          <div className="flex justify-between text-sm text-white/70 tabular-nums">
            <span>{mmss(t)}</span>
            <span>{duracao > 0 ? mmss(duracao) : "--:--"}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button type="button" onClick={anterior} aria-label="Faixa anterior" className="flex size-14 items-center justify-center rounded-full hover:bg-white/10">
            <SkipBack className="size-7 fill-white" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={alternar}
            disabled={estado === "carregando"}
            aria-label={tocando ? "Pausar" : "Tocar"}
            className="foco-claro flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900 shadow-[0_8px_16px_-6px_rgba(232,154,60,0.6)] disabled:opacity-60"
          >
            {tocando ? <Pause className="size-9 fill-night-900" aria-hidden="true" /> : <Play className="ml-1 size-9 fill-night-900" aria-hidden="true" />}
          </button>
          <button type="button" onClick={proxima} aria-label="Próxima faixa" className="flex size-14 items-center justify-center rounded-full hover:bg-white/10">
            <SkipForward className="size-7 fill-white" aria-hidden="true" />
          </button>
        </div>

        <div className="flex w-full max-w-md justify-around">
          {botaoRodape("like", "Curtir", Heart)}
          {botaoRodape("save", "Salvar", Bookmark)}
          {botaoRodape("support", "Apoiar", HeartHandshake)}
          <button type="button" onClick={() => void compartilhar()} className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold text-white/80 hover:bg-white/10">
            <Share2 className="size-6" aria-hidden="true" />
            Compartilhar
          </button>
        </div>
        {aviso && (
          <p role="status" className="text-sm text-brand-2">
            {aviso.texto}{" "}
            {aviso.login && (
              <Link href="/login" onClick={() => abrir(false)} className="font-semibold underline underline-offset-2">
                Entrar
              </Link>
            )}
          </p>
        )}

        {atual.note && (
          <section aria-label="Notas do playlister" className="w-full max-w-md rounded-lg bg-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-brand">Notas{atual.playlister ? ` de ${atual.playlister}` : " do playlister"}</h3>
            <p className="mt-1 text-pretty text-white/90">{atual.note}</p>
          </section>
        )}

        {ficha.length > 0 && (
          <details className="group w-full max-w-md rounded-lg bg-white/10 px-4 py-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold">
              Ficha técnica
              <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {ficha.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-white/70">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </dialog>
  );
}
