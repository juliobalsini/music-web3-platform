"use client";
/* eslint-disable @next/next/no-img-element -- imagem do bucket por URL assinada; sem otimizador (cota). */

import { Download, Flag, Pause, Play, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { usePlayer } from "@/components/player-provider";
import { capaGerada } from "@/lib/radio/rules";
import { CLIP_SEGUNDOS, diasRestantes, inicioDoTrecho, linksCompartilhar, type Story } from "@/lib/stories/rules";

export type FaixaDoStory = { id: string; title: string; artistName: string; durationSec: number | null };

const chip = "flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-semibold hover:bg-white/15";

/** Trecho de 15 s: usa um <audio> próprio (não passa pelo player global, então não gera escuta nem pontos). */
function Trecho({ faixa, inicio }: { faixa: FaixaDoStory; inicio: number | null }) {
  const player = usePlayer();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);
  const [erro, setErro] = useState(false);
  const comeco = inicioDoTrecho(inicio, faixa.durationSec);

  useEffect(() => () => audio.current?.pause(), []);

  async function alternar() {
    setErro(false);
    if (audio.current && !audio.current.paused) {
      audio.current.pause();
      return;
    }
    if (player.estado === "tocando") player.alternar();
    try {
      if (!audio.current) {
        const r = await fetch(`/api/tracks/${faixa.id}/play`);
        if (!r.ok) throw new Error("play");
        const { url } = (await r.json()) as { url: string };
        const el = new Audio(url);
        el.preload = "metadata";
        el.onpause = () => setTocando(false);
        el.onplay = () => setTocando(true);
        el.ontimeupdate = () => {
          if (el.currentTime >= comeco + CLIP_SEGUNDOS) {
            el.pause();
            el.currentTime = comeco;
          }
        };
        el.onerror = () => setErro(true);
        audio.current = el;
      }
      audio.current.currentTime = comeco;
      await audio.current.play();
    } catch {
      setErro(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => void alternar()} data-testid="trecho" className="foco-claro flex min-h-12 items-center gap-3 rounded-xl bg-white/10 px-3 text-left">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900">
          {tocando ? <Pause className="size-5 fill-night-900" /> : <Play className="ml-0.5 size-5 fill-night-900" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{tocando ? "Pausar trecho" : `Ouvir trecho de ${CLIP_SEGUNDOS} s`}</span>
          <span className="block truncate text-xs text-white/70">{faixa.title} · {faixa.artistName}</span>
        </span>
      </button>
      {erro && <p role="status" className="text-sm text-brand-2">Não foi possível tocar o trecho agora.</p>}
    </div>
  );
}

/** Compartilhar o story: cartão 9:16 + WhatsApp, Facebook, LinkedIn; Instagram usa o cartão baixado. */
function Compartilhar({ story }: { story: Story }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const url = typeof window === "undefined" ? "" : `${location.origin}/story/${story.id}`;
  const texto = `${story.authorName} no radioOn`;

  async function nativo() {
    const dados: ShareData = { title: texto, text: story.body ?? texto, url };
    try {
      if (!navigator.share) {
        await navigator.clipboard.writeText(url);
        setAviso("Link copiado.");
        return;
      }
      try {
        const r = await fetch(`/api/stories/${story.id}/cartao`);
        if (r.ok) {
          const arquivo = new File([await r.blob()], "story-radioon.png", { type: "image/png" });
          if (navigator.canShare?.({ files: [arquivo] })) dados.files = [arquivo];
        }
      } catch {
        /* só o link */
      }
      await navigator.share(dados);
    } catch {
      /* cancelado */
    }
  }

  const links = linksCompartilhar(url || `/story/${story.id}`, texto);
  return (
    <section aria-label="Compartilhar story" className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void nativo()} className={chip}>
          <Share2 className="size-4" aria-hidden="true" /> Compartilhar
        </button>
        <a href={`/api/stories/${story.id}/cartao`} download={`story-radioon-${story.id}.png`} className={chip}>
          <Download className="size-4" aria-hidden="true" /> Baixar cartão
        </a>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={chip}>WhatsApp</a>
        <a href={links.facebook} target="_blank" rel="noopener noreferrer" className={chip}>Facebook</a>
        <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className={chip}>LinkedIn</a>
        <a href={`/api/stories/${story.id}/cartao`} target="_blank" rel="noopener noreferrer" className={chip}>Instagram: abrir cartão</a>
      </div>
      <p className="text-xs text-white/70">Instagram não tem link de compartilhar: baixe o cartão e poste nos seus stories.</p>
      {aviso && <p role="status" className="text-sm text-brand-2">{aviso}</p>}
    </section>
  );
}

/** Denunciar: só contas; após 3 denúncias distintas o story some para todos. */
function Denunciar({ id }: { id: string }) {
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "login" | "erro">("");
  async function enviar() {
    setEstado("enviando");
    try {
      const r = await fetch(`/api/stories/${id}/denunciar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setEstado(r.ok ? "ok" : r.status === 401 ? "login" : "erro");
    } catch {
      setEstado("erro");
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => void enviar()} disabled={estado === "enviando" || estado === "ok"} className="flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-sm text-white/70 hover:text-white disabled:opacity-60">
        <Flag className="size-4" aria-hidden="true" /> {estado === "ok" ? "Denúncia enviada" : "Denunciar"}
      </button>
      {estado === "ok" && <p role="status" className="text-sm text-white/70">Obrigado. Stories muito denunciados saem do ar até serem revisados.</p>}
      {estado === "login" && (
        <p role="status" className="text-sm text-brand-2">
          Entre com uma conta para denunciar. <Link href="/login" className="font-semibold underline underline-offset-2">Entrar</Link>
        </p>
      )}
      {estado === "erro" && <p role="status" className="text-sm text-brand-2">Não foi possível denunciar agora.</p>}
    </div>
  );
}

/** Conteúdo de um story (usado no visor e na página `/story/[id]`). */
export function ConteudoStory({ story, faixa, agora }: { story: Story; faixa: FaixaDoStory | null; agora: number }) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const dias = diasRestantes(story.createdAt, agora);
  return (
    <article aria-label={`Story de ${story.authorName}`} className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span aria-hidden="true" style={{ background: capaGerada(story.authorName).fundo }} className="flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-white">
          {story.authorName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          {story.isPlatform ? (
            <p className="truncate font-semibold">{story.authorName}</p>
          ) : (
            <Link href={`/perfil/${story.authorId}`} className="block truncate font-semibold underline-offset-2 hover:underline">{story.authorName}</Link>
          )}
          <p className="text-xs text-white/70">{dias > 0 ? `No ar por mais ${dias} ${dias === 1 ? "dia" : "dias"}` : "Arquivado no perfil"}</p>
        </div>
      </header>
      {story.hasImage && !imagemFalhou && (
        <img src={`/api/stories/${story.id}/imagem`} alt="" onError={() => setImagemFalhou(true)} className="max-h-[50vh] w-full rounded-xl bg-night-800 object-cover" />
      )}
      {story.body && <p className="text-xl font-semibold text-pretty">{story.body}</p>}
      {faixa && <Trecho faixa={faixa} inicio={story.clipStart} />}
      <Compartilhar story={story} />
      <Denunciar id={story.id} />
    </article>
  );
}
