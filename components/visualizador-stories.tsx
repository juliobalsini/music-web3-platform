"use client";
/* eslint-disable @next/next/no-img-element -- imagens do bucket por URL assinada; sem otimizador (cota). */

import { Heart, MessageCircle, MoreHorizontal, Send, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CapaArte } from "@/components/capa";
import { Logo } from "@/components/logo";
import { PainelCompartilhar, PainelComentarios, PainelMenu } from "@/components/story-paineis";
import { marcarVistoLocal } from "@/components/stories-vistos";
import { usePlayer } from "@/components/player-provider";
import { capaGerada } from "@/lib/radio/rules";
import { CLIP_SEGUNDOS, inicioDoTrecho, type GrupoStories } from "@/lib/stories/rules";
import { anterior, classificarGesto, duracaoDoStory, proxima, tempoRelativo, trocarPerfil, zonaDoToque, type FaixaDoStory, type Posicao } from "@/lib/stories/viewer";

type Painel = null | "compartilhar" | "comentarios" | "menu";

/**
 * Visualizador de stories em tela cheia (padrão Instagram): barras de progresso, avanço automático,
 * gestos (toque nos terços, segurar pausa, deslizar troca de perfil/fecha) e barra inferior fina.
 * Usa <dialog> modal: cobre o cabeçalho, o player e a navegação do app e prende o foco.
 */
export function VisualizadorStories({
  grupos,
  faixas,
  agora,
  inicio,
  onFechar,
  convite = false,
}: {
  grupos: GrupoStories[];
  faixas: Record<string, FaixaDoStory>;
  agora: number;
  inicio: Posicao;
  onFechar: () => void;
  /** Link compartilhado: ao fim, em vez de só fechar, convida a entrar no radioOn. */
  convite?: boolean;
}) {
  const player = usePlayer();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [pos, setPos] = useState<Posicao>(inicio);
  const [fim, setFim] = useState(false);
  const [segurando, setSegurando] = useState(false);
  const [painel, setPainel] = useState<Painel>(null);
  const [foco, setFoco] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [curtiu, setCurtiu] = useState(false);
  const [dono, setDono] = useState(false);
  const [apagados, setApagados] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const [texto, setTexto] = useState("");
  const [loginPara, setLoginPara] = useState(false);

  const grupo = grupos[pos.g];
  const story = grupo?.stories[pos.i];
  const faixa = story?.trackId ? (faixas[story.trackId] ?? null) : null;
  const duracao = story ? duracaoDoStory(story, faixa?.durationSec ?? null) : 5000;
  const pausado = segurando || painel !== null || foco || fim;

  const posRef = useRef(pos);
  const mudoRef = useRef(mudo);
  const pausadoRef = useRef(pausado);

  const fechar = useCallback(() => {
    dialogo.current?.close();
    onFechar();
  }, [onFechar]);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  const avancar = useCallback(() => {
    const p = proxima(grupos, posRef.current);
    if (p) setPos(p);
    else if (convite) setFim(true);
    else fechar();
  }, [grupos, convite, fechar]);
  const voltar = useCallback(() => setPos(anterior(grupos, posRef.current)), [grupos]);
  const avancarRef = useRef(avancar);
  useEffect(() => {
    posRef.current = pos;
    mudoRef.current = mudo;
    pausadoRef.current = pausado;
    avancarRef.current = avancar;
  });

  // Ao mudar de story: registra visto (local e servidor), carrega estado da curtida e zera estados locais.
  const idStory = story?.id;
  useEffect(() => {
    if (!idStory) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reinicia o estado ao trocar de story */
    setImagemFalhou(false);
    setCurtiu(false);
    setDono(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    marcarVistoLocal(idStory);
    if (!/^00000000-0000-4000-8000-0000000000a2$/.test(idStory)) {
      void fetch(`/api/stories/${idStory}/visualizar`, { method: "POST" }).catch(() => {});
      void fetch(`/api/stories/${idStory}/curtir`).then((r) => r.json()).then((j: { curtiu?: boolean }) => setCurtiu(!!j.curtiu)).catch(() => {});
    }
  }, [idStory]);

  // Temporizador: pausa e retoma com o tempo restante.
  const restante = useRef(duracao);
  const ultimoId = useRef<string | null>(null);
  const inicioTs = useRef(0);
  useEffect(() => {
    if (!idStory || pausado) return;
    if (ultimoId.current !== idStory) {
      ultimoId.current = idStory;
      restante.current = duracao;
    }
    inicioTs.current = Date.now();
    const t = setTimeout(() => avancarRef.current(), Math.max(0, restante.current));
    return () => {
      clearTimeout(t);
      restante.current -= Date.now() - inicioTs.current;
    };
  }, [idStory, pausado, duracao]);

  // Áudio do trecho: um <audio> reaproveitado; URLs assinadas guardadas (uma por faixa; sem HEAD/LIST).
  const audio = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<string, string>());
  const urlDe = useCallback(async (id: string) => {
    const guardada = urls.current.get(id);
    if (guardada) return guardada;
    const r = await fetch(`/api/tracks/${id}/play`);
    if (!r.ok) throw new Error("play");
    const { url } = (await r.json()) as { url: string };
    urls.current.set(id, url);
    return url;
  }, []);
  const faixaId = faixa?.id ?? null;
  const comeco = story ? inicioDoTrecho(story.clipStart, faixa?.durationSec ?? null) : 0;
  useEffect(() => {
    const el = audio.current ?? (audio.current = new Audio());
    el.pause();
    if (!faixaId) return;
    let vivo = true;
    urlDe(faixaId)
      .then((url) => {
        if (!vivo) return;
        if (player.estado === "tocando") player.alternar();
        el.src = url;
        el.preload = "auto";
        el.currentTime = comeco;
        el.muted = mudoRef.current;
        el.ontimeupdate = () => {
          if (el.currentTime >= comeco + CLIP_SEGUNDOS) el.pause();
        };
        if (!pausadoRef.current) void el.play().catch(() => {});
      })
      .catch(() => {});
    return () => {
      vivo = false;
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao trocar de story
  }, [idStory, faixaId, comeco, urlDe]);
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.muted = mudo;
    if (pausado) el.pause();
    else if (faixaId && el.src && el.currentTime < comeco + CLIP_SEGUNDOS) void el.play().catch(() => {});
  }, [pausado, mudo, faixaId, comeco]);
  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  // Pré-carrega capa/imagem e áudio do próximo story.
  const prox = proxima(grupos, pos);
  const proximoStory = prox ? grupos[prox.g].stories[prox.i] : null;
  useEffect(() => {
    if (!proximoStory) return;
    if (proximoStory.hasImage) new Image().src = `/api/stories/${proximoStory.id}/imagem`;
    const f = proximoStory.trackId ? faixas[proximoStory.trackId] : null;
    if (f) {
      if (f.hasCover) new Image().src = `/api/tracks/${f.id}/capa`;
      void urlDe(f.id).catch(() => {});
    }
  }, [proximoStory, faixas, urlDe]);

  // Gestos no palco.
  const toque = useRef<{ x: number; y: number; t: number; w: number; x0: number; hold: ReturnType<typeof setTimeout> } | null>(null);
  function aoPressionar(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    toque.current = { x: e.clientX, y: e.clientY, t: Date.now(), w: r.width, x0: r.left, hold: setTimeout(() => setSegurando(true), 220) };
  }
  function aoSoltar(e: React.PointerEvent<HTMLDivElement>) {
    const t = toque.current;
    toque.current = null;
    if (!t) return;
    clearTimeout(t.hold);
    setSegurando(false);
    const g = classificarGesto({ dx: e.clientX - t.x, dy: e.clientY - t.y, ms: Date.now() - t.t });
    if (g === "toque") {
      const z = zonaDoToque(e.clientX - t.x0, t.w);
      if (z === "direita") avancar();
      else if (z === "esquerda") voltar();
    } else if (g === "baixo") fechar();
    else if (g === "horizontal") {
      const d = e.clientX - t.x < 0 ? 1 : -1;
      const p = trocarPerfil(grupos, posRef.current, d);
      if (p) setPos(p);
      else if (d === 1) fechar();
    }
  }
  function aoCancelar() {
    if (toque.current) clearTimeout(toque.current.hold);
    toque.current = null;
    setSegurando(false);
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "ArrowRight") avancar();
    else if (e.key === "ArrowLeft") voltar();
    else if (e.key === " " && e.target === e.currentTarget) {
      e.preventDefault();
      setSegurando((s) => !s);
    }
  }

  async function curtir() {
    if (!story) return;
    const novo = !curtiu;
    setCurtiu(novo);
    try {
      const r = await fetch(`/api/stories/${story.id}/curtir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curtir: novo }) });
      if (!r.ok) setCurtiu(!novo);
    } catch {
      setCurtiu(!novo);
    }
  }
  async function enviarRapido(e: React.FormEvent) {
    e.preventDefault();
    if (!story || !texto.trim()) return;
    try {
      const r = await fetch(`/api/stories/${story.id}/comentarios`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "texto", body: texto }) });
      if (r.status === 401) setLoginPara(true);
      else if (!r.ok) setAviso(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível comentar agora.");
      else {
        setTexto("");
        setLoginPara(false);
        setAviso("Comentário publicado.");
      }
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    }
  }

  const fundo = useMemo(() => capaGerada(grupo?.authorName ?? "radioOn").fundo, [grupo?.authorName]);
  if (!grupo || !story) return null;
  const apagado = apagados.has(story.id);
  const nomeGrupo = `Stories de ${grupo.authorName}`;
  const botaoTopo = "flex size-11 items-center justify-center rounded-full bg-night-900/40 hover:bg-night-900/60";

  return (
    <dialog
      ref={dialogo}
      aria-label={nomeGrupo}
      onClose={onFechar}
      onKeyDown={aoTeclar}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-night-900 p-0 text-white backdrop:bg-night-900"
    >
      <div className="relative mx-auto h-full w-full max-w-md overflow-hidden bg-night-900" data-testid="story-palco">
        {/* Fundo: capa desfocada da faixa, ou o gradiente do perfil. */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: fundo }}>
          {faixa &&
            (faixa.hasCover ? (
              <img src={`/api/tracks/${faixa.id}/capa`} alt="" className="size-full scale-125 object-cover blur-2xl" />
            ) : (
              <CapaArte title={faixa.title} className="size-full scale-125 blur-2xl" />
            ))}
          <div className="absolute inset-0 bg-night-900/45" />
        </div>

        {/* Camada de gestos (abaixo dos controles). */}
        <div
          data-testid="story-gestos"
          className="absolute inset-0 touch-none select-none"
          onPointerDown={aoPressionar}
          onPointerUp={aoSoltar}
          onPointerCancel={aoCancelar}
        />

        {/* Conteúdo (não captura toques; só o cartão da faixa). */}
        <div className="pointer-events-none absolute inset-x-0 top-24 bottom-24 flex flex-col items-center justify-center gap-5 px-6">
          {apagado ? (
            <p className="text-lg font-semibold">Story apagado.</p>
          ) : (
            <>
              {story.hasImage && !imagemFalhou && (
                <img key={story.id} src={`/api/stories/${story.id}/imagem`} alt="" onError={() => setImagemFalhou(true)} className="max-h-[55%] w-full rounded-2xl object-cover shadow-xl" />
              )}
              {story.body && <p data-testid="story-texto" className="max-h-[50%] overflow-hidden text-center text-2xl font-bold whitespace-pre-line text-pretty drop-shadow">{story.body}</p>}
              {faixa && (
                <div className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-night-900/70 p-3 backdrop-blur" data-testid="story-faixa">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg">
                    {faixa.hasCover ? <img src={`/api/tracks/${faixa.id}/capa`} alt="" className="size-full object-cover" /> : <CapaArte title={faixa.title} className="size-full" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{faixa.title}</p>
                    <p className="truncate text-sm text-white/80">{faixa.artistName}</p>
                  </div>
                  <Link
                    href={`/faixa/${faixa.id}`}
                    onClick={() => audio.current?.pause()}
                    className="flex min-h-11 shrink-0 items-center rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 text-sm font-bold text-night-900"
                  >
                    Ouvir a faixa
                  </Link>
                </div>
              )}
              {!story.body && !story.hasImage && !faixa && <p className="text-lg text-white/80">Story sem conteúdo.</p>}
            </>
          )}
        </div>

        {/* Topo: progresso e cabeçalho. */}
        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div aria-hidden="true" data-testid="story-barras" className="flex gap-1">
            {grupo.stories.map((s, k) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                {k < pos.i && <span className="block size-full bg-white" />}
                {k === pos.i && (
                  <span
                    key={`${s.id}-${fim}`}
                    className="story-barra-ativa block size-full origin-left bg-white"
                    style={{ animation: `story-barra ${duracao}ms linear forwards`, animationPlayState: pausado ? "paused" : "running" }}
                  />
                )}
              </span>
            ))}
          </div>
          <header className="flex items-center gap-2">
            <span aria-hidden="true" style={grupo.isPlatform ? undefined : { background: fundo }} className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${grupo.isPlatform ? "bg-night-800" : ""}`}>
              {grupo.isPlatform ? <Logo className="h-6 w-auto" alt="" /> : grupo.authorName.charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <Link href={`/perfil/${grupo.authorId}`} className="truncate text-sm font-bold underline-offset-2 hover:underline">{grupo.authorName}</Link>
              <span className="shrink-0 text-xs text-white/80">{tempoRelativo(story.createdAt, agora)}</span>
            </div>
            {faixa && (
              <button type="button" onClick={() => setMudo((m) => !m)} aria-label={mudo ? "Ativar som" : "Silenciar"} aria-pressed={mudo} className={botaoTopo}>
                {mudo ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
              </button>
            )}
            <button type="button" onClick={() => setPainel("menu")} aria-label="Mais opções" aria-haspopup="dialog" className={botaoTopo}>
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={fechar} aria-label="Fechar stories" className={botaoTopo}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>
        </div>

        {/* Controles só para teclado e leitor de tela (as setas visíveis foram removidas). */}
        <button type="button" onClick={voltar} className="sr-only">Story anterior</button>
        <button type="button" onClick={avancar} className="sr-only">Próximo story</button>
        <p aria-live="polite" className="sr-only">{`Story ${pos.i + 1} de ${grupo.stories.length}`}</p>

        {/* Barra inferior fina: comentar, curtir, compartilhar. */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {loginPara && (
            <p role="status" className="rounded-lg bg-night-900/80 px-3 py-2 text-sm text-brand-2">
              Entre com uma conta para comentar. <Link href={`/login?next=${encodeURIComponent(`/story/${story.id}`)}`} className="font-semibold underline underline-offset-2">Entrar</Link>
            </p>
          )}
          {aviso && !loginPara && <p role="status" className="rounded-lg bg-night-900/80 px-3 py-2 text-sm">{aviso}</p>}
          <div className="flex items-center gap-1">
            <form onSubmit={(e) => void enviarRapido(e)} className="flex min-w-0 flex-1 items-center gap-1">
              <input
                value={texto}
                onChange={(e) => { setTexto(e.target.value.slice(0, 140)); setAviso(null); }}
                onFocus={() => setFoco(true)}
                onBlur={() => setFoco(false)}
                maxLength={140}
                aria-label="Comentar"
                placeholder="Comentar…"
                className="min-h-11 min-w-0 flex-1 rounded-full border border-white/50 bg-night-900/40 px-4 text-sm placeholder:text-white/80"
              />
              {texto.trim() && (
                <button type="submit" aria-label="Enviar comentário" className={botaoTopo}><Send className="size-5" aria-hidden="true" /></button>
              )}
            </form>
            <button type="button" onClick={() => setPainel("comentarios")} aria-label="Ver comentários e reações" className={botaoTopo}>
              <MessageCircle className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => void curtir()} aria-label={curtiu ? "Descurtir" : "Curtir"} aria-pressed={curtiu} className={botaoTopo}>
              <Heart className={`size-5 ${curtiu ? "fill-brand text-brand" : ""}`} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPainel("compartilhar")} aria-label="Compartilhar" aria-haspopup="dialog" className={botaoTopo}>
              <Send className="size-5 -rotate-12" aria-hidden="true" />
            </button>
          </div>
        </div>

        {painel === "compartilhar" && <PainelCompartilhar story={story} onFechar={() => setPainel(null)} />}
        {painel === "comentarios" && <PainelComentarios story={story} dono={dono} onFechar={() => setPainel(null)} onMudou={() => {}} />}
        {painel === "menu" && (
          <PainelMenu
            story={story}
            onFechar={() => setPainel(null)}
            onDono={setDono}
            onApagado={() => {
              setApagados((s) => new Set(s).add(story.id));
              setPainel(null);
            }}
          />
        )}

        {fim && (
          <div role="region" aria-label="Convite" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-night-900/90 px-8 text-center">
            <Logo className="h-16 w-auto" alt="radioOn" />
            <p className="text-lg font-bold text-pretty">Música independente, sem cadastro para ouvir.</p>
            <Link href="/" className="flex min-h-12 items-center rounded-full bg-gradient-to-br from-brand to-brand-2 px-6 font-bold text-night-900">Entrar no radioOn</Link>
            <button type="button" onClick={fechar} className="min-h-11 text-sm text-white/80 underline underline-offset-2">Fechar</button>
          </div>
        )}
      </div>
    </dialog>
  );
}
