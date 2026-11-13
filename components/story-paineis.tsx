"use client";

import { Copy, Download, Flag, Eye, Heart, MessageCircle, MoreHorizontal, Share2, Trash2, X } from "lucide-react";
import { ICONES_REDES, type Rede } from "@/lib/stories/icones-redes";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { FIGURINHAS, MAX_COMENTARIO, REACOES } from "@/lib/stories/moderacao";
import { linksRedes } from "@/lib/stories/viewer";
import type { Story } from "@/lib/stories/rules";

/** Painel deslizante de baixo para cima; toque fora ou X fecham. */
export function Folha({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button type="button" aria-label={`Fechar ${titulo.toLowerCase()}`} onClick={onFechar} className="absolute inset-0 bg-night-900/60" />
      <section role="region" aria-label={titulo} className="story-folha relative flex max-h-[75%] flex-col gap-3 overflow-y-auto rounded-t-2xl bg-night-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar painel" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function IconeRede({ rede }: { rede: Rede }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden="true">
      <path d={ICONES_REDES[rede]} />
    </svg>
  );
}

const iconeRede = "flex size-14 items-center justify-center rounded-full bg-white/10 text-sm font-bold hover:bg-white/15";

/** Compartilhar: linha de ícones; Instagram usa a folha nativa com o cartão 9:16 como arquivo. */
export function PainelCompartilhar({ story, onFechar }: { story: Story; onFechar: () => void }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const url = typeof window === "undefined" ? "" : `${location.origin}/story/${story.id}`;
  const texto = `${story.authorName} na radioOn`;
  const redes = linksRedes(url, texto);

  async function cartao(): Promise<File | null> {
    try {
      const r = await fetch(`/api/stories/${story.id}/cartao`);
      if (!r.ok) return null;
      return new File([await r.blob()], "story-radioon.png", { type: "image/png" });
    } catch {
      return null;
    }
  }
  function baixar(arquivo: File) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(arquivo);
    a.download = `story-radioon-${story.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function instagram() {
    setAviso("Preparando o cartão…");
    const arquivo = await cartao();
    if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
      setAviso(null);
      try {
        await navigator.share({ files: [arquivo], title: texto });
      } catch {
        /* cancelado */
      }
      return;
    }
    if (!arquivo) return setAviso("Não foi possível gerar o cartão agora.");
    baixar(arquivo);
    setAviso("Cartão baixado. Abra o Instagram e poste nos seus stories.");
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Link copiado.");
    } catch {
      setAviso("Não foi possível copiar. Copie o endereço da barra do navegador.");
    }
  }
  async function mais() {
    if (!navigator.share) return void (await copiar());
    try {
      await navigator.share({ title: texto, text: story.body ?? texto, url });
    } catch {
      /* cancelado */
    }
  }

  const item = "flex w-16 shrink-0 flex-col items-center gap-1 text-xs";
  return (
    <Folha titulo="Compartilhar" onFechar={onFechar}>
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <li className={item}><a href={redes.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={iconeRede}><IconeRede rede="whatsapp" /></a>WhatsApp</li>
        <li className={item}><button type="button" onClick={() => void instagram()} aria-label="Instagram" className={iconeRede}><IconeRede rede="instagram" /></button>Instagram</li>
        <li className={item}><a href={redes.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={iconeRede}><IconeRede rede="facebook" /></a>Facebook</li>
        <li className={item}><a href={redes.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={iconeRede}><IconeRede rede="linkedin" /></a>LinkedIn</li>
        <li className={item}><button type="button" onClick={() => void copiar()} aria-label="Copiar link" className={iconeRede}><Copy className="size-5" aria-hidden="true" /></button>Copiar link</li>
        <li className={item}><button type="button" onClick={() => void mais()} aria-label="Mais" className={iconeRede}><Share2 className="size-5" aria-hidden="true" /></button>Mais</li>
      </ul>
      <button
        type="button"
        onClick={async () => {
          const a = await cartao();
          if (a) baixar(a);
          else setAviso("Não foi possível gerar o cartão agora.");
        }}
        className="flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-sm text-white/70 hover:text-white"
      >
        <Download className="size-4" aria-hidden="true" /> Baixar cartão
      </button>
      {aviso && <p role="status" className="text-sm text-brand-2">{aviso}</p>}
    </Folha>
  );
}

type Comentario = { id: string; kind: string; body: string; createdAt: string; autor: string; meu: boolean };

/** Comentários públicos (só contas): lista, reações rápidas, figurinhas e campo de texto de até 140 caracteres. */
export function PainelComentarios({ story, dono, onFechar, onMudou }: { story: Story; dono: boolean; onFechar: () => void; onMudou: () => void }) {
  const [lista, setLista] = useState<Comentario[] | null>(null);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<{ tipo: "erro" | "login" | "ok"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/stories/${story.id}/comentarios`);
      const j = (await r.json()) as { comentarios?: Comentario[] };
      setLista(j.comentarios ?? []);
    } catch {
      setLista([]);
    }
  }, [story.id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega ao abrir o painel
    void carregar();
  }, [carregar]);

  async function enviar(kind: "texto" | "reacao" | "figurinha", body: string) {
    if (enviando) return;
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/stories/${story.id}/comentarios`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, body }) });
      if (r.status === 401) setMsg({ tipo: "login", texto: "Entre com uma conta para comentar." });
      else if (!r.ok) setMsg({ tipo: "erro", texto: ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível comentar agora." });
      else {
        if (kind === "texto") setTexto("");
        setMsg({ tipo: "ok", texto: "Publicado." });
        onMudou();
        await carregar();
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Sem conexão. Tente de novo." });
    } finally {
      setEnviando(false);
    }
  }
  async function acao(c: Comentario, tipo: "apagar" | "denunciar") {
    const r = await fetch(tipo === "apagar" ? `/api/stories/comentarios/${c.id}` : `/api/stories/comentarios/${c.id}/denunciar`, { method: tipo === "apagar" ? "DELETE" : "POST" });
    if (r.status === 401) setMsg({ tipo: "login", texto: "Entre com uma conta para denunciar." });
    else if (r.ok) {
      setMsg({ tipo: "ok", texto: tipo === "apagar" ? "Comentário apagado." : "Denúncia enviada. Obrigado." });
      if (tipo === "apagar") setLista((l) => (l ?? []).filter((x) => x.id !== c.id));
    } else setMsg({ tipo: "erro", texto: "Não foi possível agora." });
  }

  const chip = "flex min-h-11 items-center justify-center rounded-full bg-white/10 px-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-50";
  return (
    <Folha titulo="Comentários" onFechar={onFechar}>
      <div role="group" aria-label="Reações rápidas" className="flex flex-wrap gap-2">
        {REACOES.map((e) => (
          <button key={e} type="button" disabled={enviando} onClick={() => void enviar("reacao", e)} aria-label={`Reagir ${e}`} className={`${chip} size-11 px-0 text-xl`}>{e}</button>
        ))}
      </div>
      <div role="group" aria-label="Figurinhas" className="flex flex-wrap gap-2">
        {FIGURINHAS.map((f) => (
          <button key={f} type="button" disabled={enviando} onClick={() => void enviar("figurinha", f)} className={`${chip} border border-brand/60 text-brand`}>{f}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (texto.trim()) void enviar("texto", texto); }} className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, MAX_COMENTARIO))}
          maxLength={MAX_COMENTARIO}
          aria-label="Escrever comentário"
          placeholder="Comentar…"
          className="min-h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-sm placeholder:text-white/60"
        />
        <button type="submit" disabled={enviando || !texto.trim()} className="min-h-11 rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 text-sm font-bold text-night-900 disabled:opacity-50">Enviar</button>
      </form>
      <p className="text-xs text-white/70">{texto.length}/{MAX_COMENTARIO} · só contas comentam</p>
      {msg && (
        <p role="status" className={`text-sm ${msg.tipo === "ok" ? "text-white/80" : "text-brand-2"}`}>
          {msg.texto} {msg.tipo === "login" && <Link href={`/login?next=${encodeURIComponent(`/story/${story.id}`)}`} className="font-semibold underline underline-offset-2">Entrar</Link>}
        </p>
      )}
      <ul aria-label="Lista de comentários" className="flex flex-col gap-2">
        {lista === null && <li className="text-sm text-white/70">Carregando…</li>}
        {lista?.length === 0 && <li className="text-sm text-white/70">Ninguém comentou ainda.</li>}
        {lista?.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            <p className="min-w-0 flex-1 text-pretty">
              <span className="font-semibold">{c.autor}</span>{" "}
              <span className={c.kind === "figurinha" ? "rounded-full border border-brand/60 px-2 py-0.5 font-bold text-brand" : c.kind === "reacao" ? "text-lg" : ""}>{c.body}</span>
            </p>
            {(dono || c.meu) && (
              <button type="button" onClick={() => void acao(c, "apagar")} aria-label="Apagar comentário" className="flex size-11 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
            {!c.meu && (
              <button type="button" onClick={() => void acao(c, "denunciar")} aria-label="Denunciar comentário" className="flex size-11 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
                <Flag className="size-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Folha>
  );
}

type Stats = { visualizacoes: number; curtidas: number; comentarios: number };

/** Menu ⋯: visitante vê Denunciar; o dono vê Visualizações e Apagar. Descobre se é o dono pela API de estatísticas. */
export function PainelMenu({ story, onFechar, onApagado, onDono }: { story: Story; onFechar: () => void; onApagado: () => void; onDono: (dono: boolean) => void }) {
  const [stats, setStats] = useState<Stats | null | "carregando">("carregando");
  const [estado, setEstado] = useState<"" | "ok" | "login" | "erro" | "confirmar">("");
  const dono = useRef(false);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/stories/${story.id}/estatisticas`)
      .then(async (r) => (r.ok ? ((await r.json()) as Stats) : null))
      .then((s) => {
        if (!vivo) return;
        dono.current = !!s;
        onDono(!!s);
        setStats(s);
      })
      .catch(() => vivo && setStats(null));
    return () => {
      vivo = false;
    };
  }, [story.id, onDono]);

  async function denunciar() {
    try {
      const r = await fetch(`/api/stories/${story.id}/denunciar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setEstado(r.ok ? "ok" : r.status === 401 ? "login" : "erro");
    } catch {
      setEstado("erro");
    }
  }
  async function apagar() {
    try {
      const r = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
      if (r.ok) onApagado();
      else setEstado("erro");
    } catch {
      setEstado("erro");
    }
  }

  const linha = "flex min-h-12 items-center gap-3 rounded-lg px-2 text-left text-sm font-semibold hover:bg-white/10 disabled:opacity-60";
  const ehDono = stats !== null && stats !== "carregando";
  return (
    <Folha titulo="Mais opções" onFechar={onFechar}>
      {ehDono && (
        <>
          <p className="flex items-center gap-3 px-2 text-sm" data-testid="story-estatisticas">
            <Eye className="size-4" aria-hidden="true" /> {stats.visualizacoes} {stats.visualizacoes === 1 ? "visualização" : "visualizações"}
            <Heart className="size-4" aria-hidden="true" /> {stats.curtidas} {stats.curtidas === 1 ? "curtida" : "curtidas"}
            <MessageCircle className="size-4" aria-hidden="true" /> {stats.comentarios}
          </p>
          {estado === "confirmar" ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => void apagar()} className="min-h-11 flex-1 rounded-lg bg-brand-2 px-3 text-sm font-bold text-night-900">Apagar de vez</button>
              <button type="button" onClick={() => setEstado("")} className="min-h-11 flex-1 rounded-lg bg-white/10 px-3 text-sm font-semibold">Cancelar</button>
            </div>
          ) : (
            <button type="button" onClick={() => setEstado("confirmar")} className={linha}><Trash2 className="size-4" aria-hidden="true" /> Apagar story</button>
          )}
        </>
      )}
      {!ehDono && stats !== "carregando" && !story.isPlatform && (
        <button type="button" onClick={() => void denunciar()} disabled={estado === "ok"} className={linha}>
          <Flag className="size-4" aria-hidden="true" /> {estado === "ok" ? "Denúncia enviada" : "Denunciar"}
        </button>
      )}
      {stats === "carregando" && <p className="px-2 text-sm text-white/70">Carregando…</p>}
      {estado === "ok" && <p role="status" className="px-2 text-sm text-white/70">Obrigado. Stories muito denunciados saem do ar até serem revisados.</p>}
      {estado === "login" && (
        <p role="status" className="px-2 text-sm text-brand-2">
          Entre com uma conta para denunciar. <Link href={`/login?next=${encodeURIComponent(`/story/${story.id}`)}`} className="font-semibold underline underline-offset-2">Entrar</Link>
        </p>
      )}
      {estado === "erro" && <p role="status" className="px-2 text-sm text-brand-2">Não foi possível agora.</p>}
    </Folha>
  );
}

export const IconeMais = MoreHorizontal;
