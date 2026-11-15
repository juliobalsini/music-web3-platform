"use client";

import { GripVertical, Pause, Play, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { adicionarFaixaA, publicar, removerFaixaDe, reordenarFaixas, salvarDetalhes } from "@/app/playlist/actions";
import { Capa } from "@/components/capa";
import { CapaPlaylist } from "@/components/capa-playlist";
import { PainelInferior } from "@/components/ds/interativos";
import { usePlayer, useTempo } from "@/components/player-provider";
import { campo, botao } from "@/components/ui";
import { MIN_FAIXAS_PUBLICAR, podePublicar, reordenar } from "@/lib/playlists/rules";
import {
  destinoArraste,
  deveRemoverAoDeslizar,
  generoPredominante,
  inicioDaPrevia,
  PREVIA_SEGUNDOS,
  sugestoes,
  type GrupoSugestao,
} from "@/lib/playlists/sugestoes";
import { EVENTO, lerLocal } from "@/lib/radio/continuar-local";
import { climaAgora } from "@/lib/radio/home";
import { buscar, type FaixaListada } from "@/lib/radio/rules";

export type FaixaEditor = FaixaListada;

/** Ids das faixas ouvidas recentemente neste aparelho (histórico do "Continue ouvindo"). */
function useRecentes(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENTO, cb);
      return () => window.removeEventListener(EVENTO, cb);
    },
    () => lerLocal().filter((a) => a.tipo === "faixa").map((a) => a.id).join(","),
    () => "",
  );
}

/** Para a prévia ao chegar a 15 s (componente à parte: só ele re-renderiza a cada atualização do tempo). */
function FimDaPrevia({ previa, aoFim }: { previa: { id: string; ate: number } | null; aoFim: () => void }) {
  const { atual } = useTempo();
  const { atual: faixa, estado } = usePlayer();
  useEffect(() => {
    if (!previa) return;
    if (faixa?.id !== previa.id) return aoFim();
    if (estado === "tocando" && atual >= previa.ate) aoFim();
  }, [previa, faixa, estado, atual, aoFim]);
  return null;
}

/** Editor com prévia ao vivo: a própria página da playlist, com título/descrição editáveis e salvamento automático. */
export function EditorPlaylist({
  id,
  titulo: tituloInicial,
  descricao: descricaoInicial,
  faixas: faixasIniciais,
  catalogo,
  publicada,
}: {
  id: string;
  titulo: string;
  descricao: string;
  faixas: FaixaEditor[];
  catalogo: FaixaEditor[];
  publicada: boolean;
}) {
  const router = useRouter();
  const player = usePlayer();
  const [titulo, setTitulo] = useState(tituloInicial);
  const [descricao, setDescricao] = useState(descricaoInicial);
  const [faixas, setFaixas] = useState(faixasIniciais);
  const [estado, setEstado] = useState<"salvo" | "salvando" | "erro">("salvo");
  const [aviso, setAviso] = useState<string | null>(null);
  const [painel, setPainel] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [novas, setNovas] = useState<Set<string>>(() => new Set());
  const [previa, setPrevia] = useState<{ id: string; ate: number } | null>(null);
  const [pendente, iniciar] = useTransition();
  const primeira = useRef(true);
  const recentes = useRecentes();
  const [agora] = useState(() => Date.now());

  // Salvamento automático (rascunho): espera 800 ms sem digitar.
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (titulo.trim() === "") return;
    const t = setTimeout(async () => {
      const r = await salvarDetalhes(id, titulo, descricao);
      setEstado(r.ok ? "salvo" : "erro");
    }, 800);
    return () => clearTimeout(t);
  }, [id, titulo, descricao]);

  const noPainel = new Set(faixas.map((f) => f.id));
  const busca = consulta.trim();
  const resultado = busca ? buscar(catalogo.filter((f) => !noPainel.has(f.id)), busca, (f) => [f.title, f.artistName]).slice(0, 40) : [];
  const grupos: GrupoSugestao<FaixaEditor>[] = busca
    ? []
    : sugestoes(catalogo, {
        naPlaylist: noPainel,
        clima: climaAgora(agora),
        genero: generoPredominante(faixas),
        recentes: recentes ? recentes.split(",") : [],
        curtidas: player.reacoes.like,
      });
  // Sem sugestão nenhuma (catálogo sem clima/gênero, aparelho sem histórico): mostra o catálogo.
  if (!busca && grupos.length === 0) {
    const resto = catalogo.filter((f) => !noPainel.has(f.id)).slice(0, 40);
    if (resto.length > 0) grupos.push({ id: "clima", titulo: "No catálogo", faixas: resto });
  }

  async function adicionar(f: FaixaEditor) {
    setFaixas((l) => (l.some((x) => x.id === f.id) ? l : [...l, f]));
    setNovas((s) => new Set(s).add(f.id));
    const r = await adicionarFaixaA(id, f.id);
    if (!r.ok) {
      setFaixas((l) => l.filter((x) => x.id !== f.id));
      setAviso(r.erro);
    }
  }
  async function remover(f: FaixaEditor) {
    const antes = faixas;
    setFaixas((l) => l.filter((x) => x.id !== f.id));
    const r = await removerFaixaDe(id, f.id);
    if (!r.ok) {
      setFaixas(antes);
      setAviso(r.erro);
    }
  }
  async function salvarOrdem(antes: FaixaEditor[], nova: FaixaEditor[]) {
    if (antes.map((f) => f.id).join() === nova.map((f) => f.id).join()) return;
    const r = await reordenarFaixas(id, nova.map((f) => f.id));
    if (!r.ok) {
      setFaixas(antes);
      setAviso(r.erro);
    }
  }
  function mover(de: number, para: number) {
    const antes = faixas;
    const nova = reordenar(faixas, de, para);
    setFaixas(nova);
    void salvarOrdem(antes, nova);
  }
  function alternarPrevia(f: FaixaEditor) {
    if (previa?.id === f.id) {
      if (player.estado === "tocando") player.alternar();
      setPrevia(null);
      return;
    }
    const inicio = inicioDaPrevia(f.durationSec);
    setPrevia({ id: f.id, ate: inicio + PREVIA_SEGUNDOS });
    player.tocar(f, [f], false, inicio);
  }
  function fimDaPrevia() {
    if (previa && player.atual?.id === previa.id && player.estado === "tocando") player.alternar();
    setPrevia(null);
  }
  function fecharPainel() {
    setPainel(false);
    if (previa) fimDaPrevia();
  }
  function aoPublicar() {
    setAviso(null);
    iniciar(async () => {
      const r = await publicar(id);
      if (!r.ok) return setAviso(r.erro);
      router.replace(`/playlist/${id}?publicada=1`);
      router.refresh();
    });
  }

  const linhaPainel = (f: FaixaEditor) => {
    const tocando = previa?.id === f.id;
    return (
      <li key={f.id} className="flex min-h-14 items-center gap-3 py-1">
        <button
          type="button"
          onClick={() => alternarPrevia(f)}
          aria-label={tocando ? `Parar prévia de ${f.title}` : `Ouvir prévia de 15 s de ${f.title}`}
          aria-pressed={tocando}
          className="relative shrink-0 rounded-md focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-11" />
          <span className="absolute inset-0 grid place-items-center rounded-md bg-black/45">
            {tocando ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </span>
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{f.title}</span>
          <span className="block truncate text-sm text-[var(--ds-texto-2)]">{f.artistName}</span>
        </span>
        <button type="button" onClick={() => adicionar(f)} aria-label={`Adicionar ${f.title}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-night-900 transition-transform active:scale-90">
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4" data-testid="editor-playlist">
      <div className="flex items-start gap-4">
        <CapaPlaylist titulo={titulo || tituloInicial} faixas={faixas} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={titulo}
            onChange={(e) => { setEstado("salvando"); setTitulo(e.target.value); }}
            maxLength={200}
            aria-label="Título da playlist"
            className="w-full rounded-lg bg-transparent px-1 text-2xl font-semibold text-balance outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <p role="status" className="px-1 text-xs text-[var(--ds-texto-2)]">
            {publicada ? "Publicada · " : "Rascunho privado · "}
            {estado === "salvando" ? "salvando…" : estado === "erro" ? "não foi possível salvar" : "salvo"}
          </p>
        </div>
      </div>
      <textarea
        value={descricao}
        onChange={(e) => { setEstado("salvando"); setDescricao(e.target.value); }}
        maxLength={500}
        rows={2}
        placeholder="Descrição (opcional)"
        aria-label="Descrição da playlist"
        className={`${campo} resize-none`}
      />

      {aviso && <p role="alert" className="rounded-lg bg-white/10 px-3 py-2 text-sm">{aviso}</p>}

      {faixas.length === 0 ? (
        <p className="text-[var(--ds-texto-2)] text-pretty">Playlist vazia. Toque em &quot;Adicionar faixas&quot; para começar.</p>
      ) : (
        <ListaEditavel faixas={faixas} novas={novas} setFaixas={setFaixas} mover={mover} salvarOrdem={salvarOrdem} remover={remover} />
      )}

      <button type="button" onClick={() => setPainel(true)} className={botao} data-testid="adicionar-faixas">
        <Plus className="size-5" aria-hidden="true" /> Adicionar faixas
      </button>

      {!publicada && (
        <div className="flex flex-col gap-1">
          <button type="button" disabled={!podePublicar(faixas.length) || pendente} onClick={aoPublicar} className={`${botao} disabled:opacity-50`} data-testid="publicar">
            Publicar playlist
          </button>
          {!podePublicar(faixas.length) && (
            <p className="text-sm text-[var(--ds-texto-2)]">Faltam {MIN_FAIXAS_PUBLICAR - faixas.length} {MIN_FAIXAS_PUBLICAR - faixas.length === 1 ? "faixa" : "faixas"} para publicar.</p>
          )}
        </div>
      )}

      <FimDaPrevia previa={previa} aoFim={fimDaPrevia} />

      <PainelInferior aberto={painel} aoFechar={fecharPainel} titulo="Adicionar faixas">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-texto-2)]" aria-hidden="true" />
          <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar faixa ou artista" aria-label="Buscar faixa ou artista" className={`${campo} pl-9`} />
        </div>
        <div className="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto" data-testid="painel-adicionar">
          {busca ? (
            resultado.length === 0 ? (
              <p className="text-sm text-[var(--ds-texto-2)]">Nenhuma faixa encontrada.</p>
            ) : (
              <ul aria-label="Resultados da busca" className="flex flex-col">{resultado.map(linhaPainel)}</ul>
            )
          ) : grupos.length === 0 ? (
            <p className="text-sm text-[var(--ds-texto-2)]">Todas as faixas do catálogo já estão na playlist.</p>
          ) : (
            grupos.map((g) => (
              <section key={g.titulo} aria-label={g.titulo} className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-[var(--ds-texto-2)]">{g.titulo}</h3>
                <ul className="flex flex-col">{g.faixas.map(linhaPainel)}</ul>
              </section>
            ))
          )}
        </div>
      </PainelInferior>
    </div>
  );
}

/**
 * Lista do editor: arrastar pela alça reordena (setas ↑/↓ na alça fazem o mesmo pelo teclado);
 * deslizar a linha para a esquerda remove (a lixeira faz o mesmo com um toque).
 */
function ListaEditavel({
  faixas,
  novas,
  setFaixas,
  mover,
  salvarOrdem,
  remover,
}: {
  faixas: FaixaEditor[];
  novas: Set<string>;
  setFaixas: (f: FaixaEditor[]) => void;
  mover: (de: number, para: number) => void;
  salvarOrdem: (antes: FaixaEditor[], nova: FaixaEditor[]) => Promise<void>;
  remover: (f: FaixaEditor) => void;
}) {
  const arraste = useRef<{ id: string; y0: number; altura: number; inicial: FaixaEditor[]; atual: FaixaEditor[] } | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const deslize = useRef<{ id: string; x0: number; y0: number; horizontal: boolean | null } | null>(null);
  const [dx, setDx] = useState<{ id: string; v: number } | null>(null);

  function iniciarArraste(e: React.PointerEvent<HTMLButtonElement>, f: FaixaEditor) {
    const li = e.currentTarget.closest("li");
    e.currentTarget.setPointerCapture(e.pointerId);
    arraste.current = { id: f.id, y0: e.clientY, altura: li?.offsetHeight || 64, inicial: faixas, atual: faixas };
    setArrastando(f.id);
  }
  function moverArraste(e: React.PointerEvent<HTMLButtonElement>) {
    const a = arraste.current;
    if (!a) return;
    const de = a.atual.findIndex((x) => x.id === a.id);
    const para = destinoArraste(de, e.clientY - a.y0, a.altura, a.atual.length);
    if (para === de) return;
    const nova = reordenar(a.atual, de, para);
    a.atual = nova;
    a.y0 += (para - de) * a.altura;
    setFaixas(nova);
  }
  function soltarArraste() {
    const a = arraste.current;
    arraste.current = null;
    setArrastando(null);
    if (a) void salvarOrdem(a.inicial, a.atual);
  }

  function iniciarDeslize(e: React.PointerEvent<HTMLLIElement>, f: FaixaEditor) {
    if ((e.target as HTMLElement).closest("button")) return;
    deslize.current = { id: f.id, x0: e.clientX, y0: e.clientY, horizontal: null };
  }
  function moverDeslize(e: React.PointerEvent<HTMLLIElement>) {
    const d = deslize.current;
    if (!d) return;
    const vx = e.clientX - d.x0;
    const vy = e.clientY - d.y0;
    if (d.horizontal === null && Math.abs(vx) + Math.abs(vy) > 8) {
      d.horizontal = Math.abs(vx) > Math.abs(vy);
      if (d.horizontal) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.horizontal) setDx({ id: d.id, v: Math.min(0, vx) });
  }
  function soltarDeslize(f: FaixaEditor) {
    const d = deslize.current;
    deslize.current = null;
    const v = dx?.id === f.id ? dx.v : 0;
    setDx(null);
    if (d?.horizontal && deveRemoverAoDeslizar(v)) remover(f);
  }

  return (
    <ol aria-label="Faixas da playlist" className="flex flex-col overflow-x-hidden">
      {faixas.map((f, i) => {
        const desloc = dx?.id === f.id ? dx.v : 0;
        return (
          <li
            key={f.id}
            onPointerDown={(e) => iniciarDeslize(e, f)}
            onPointerMove={moverDeslize}
            onPointerUp={() => soltarDeslize(f)}
            onPointerCancel={() => { deslize.current = null; setDx(null); }}
            style={{ transform: desloc ? `translateX(${desloc}px)` : undefined, touchAction: "pan-y" }}
            className={`relative flex min-h-16 items-center gap-2 rounded-lg px-1 py-2 ${desloc ? "" : "transition-transform"} ${arrastando === f.id ? "bg-[var(--ds-surface-2)] shadow-lg" : ""} ${novas.has(f.id) ? "ds-entrar" : ""} ${deveRemoverAoDeslizar(desloc) ? "opacity-60" : ""}`}
            data-testid="faixa-editor"
          >
            <span className="w-5 shrink-0 text-center text-sm tabular-nums text-[var(--ds-texto-2)]">{i + 1}</span>
            <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-12" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{f.title}</span>
              <span className="block truncate text-sm text-[var(--ds-texto-2)]">{f.artistName}</span>
            </span>
            <button type="button" onClick={() => remover(f)} aria-label={`Remover ${f.title}`} className="grid size-11 shrink-0 place-items-center rounded-lg text-[var(--ds-texto-2)] hover:bg-white/10">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => iniciarArraste(e, f)}
              onPointerMove={moverArraste}
              onPointerUp={soltarArraste}
              onPointerCancel={soltarArraste}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); mover(i, i - 1); }
                if (e.key === "ArrowDown" && i < faixas.length - 1) { e.preventDefault(); mover(i, i + 1); }
              }}
              aria-label={`Mover ${f.title} (posição ${i + 1} de ${faixas.length}; setas para cima e para baixo)`}
              className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-[var(--ds-texto-2)] hover:bg-white/10 active:cursor-grabbing"
            >
              <GripVertical className="size-5" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
