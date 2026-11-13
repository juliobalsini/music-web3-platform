"use client";

import { ArrowDown, ArrowUp, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { adicionarFaixaA, publicar, removerFaixaDe, reordenarFaixas, salvarDetalhes } from "@/app/playlist/actions";
import { Capa } from "@/components/capa";
import { campo, botao } from "@/components/ui";
import { MIN_FAIXAS_PUBLICAR, podePublicar, reordenar } from "@/lib/playlists/rules";
import { buscar } from "@/lib/radio/rules";

export type FaixaEditor = { id: string; title: string; artistName: string; hasCover: boolean };

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
  const [titulo, setTitulo] = useState(tituloInicial);
  const [descricao, setDescricao] = useState(descricaoInicial);
  const [faixas, setFaixas] = useState(faixasIniciais);
  const [estado, setEstado] = useState<"salvo" | "salvando" | "erro">("salvo");
  const [aviso, setAviso] = useState<string | null>(null);
  const [painel, setPainel] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [pendente, iniciar] = useTransition();
  const primeira = useRef(true);

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
  const resultado = buscar(catalogo.filter((f) => !noPainel.has(f.id)), consulta, (f) => [f.title, f.artistName]).slice(0, 40);

  async function adicionar(f: FaixaEditor) {
    setFaixas((l) => (l.some((x) => x.id === f.id) ? l : [...l, f]));
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
  async function mover(de: number, para: number) {
    const antes = faixas;
    const nova = reordenar(faixas, de, para);
    setFaixas(nova);
    const r = await reordenarFaixas(id, nova.map((f) => f.id));
    if (!r.ok) {
      setFaixas(antes);
      setAviso(r.erro);
    }
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

  return (
    <div className="flex flex-col gap-4" data-testid="editor-playlist">
      <div className="flex flex-col gap-2">
        <input
          value={titulo}
          onChange={(e) => { setEstado("salvando"); setTitulo(e.target.value); }}
          maxLength={200}
          aria-label="Título da playlist"
          className="w-full rounded-lg bg-transparent px-1 text-2xl font-semibold text-balance outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <textarea
          value={descricao}
          onChange={(e) => { setEstado("salvando"); setDescricao(e.target.value); }}
          maxLength={500}
          rows={2}
          placeholder="Descrição (opcional)"
          aria-label="Descrição da playlist"
          className={`${campo} resize-none`}
        />
        <p role="status" className="text-xs text-white/60">
          {publicada ? "Publicada · " : "Rascunho privado · "}
          {estado === "salvando" ? "salvando…" : estado === "erro" ? "não foi possível salvar" : "salvo"}
        </p>
      </div>

      {aviso && <p role="alert" className="rounded-lg bg-white/10 px-3 py-2 text-sm">{aviso}</p>}

      {faixas.length === 0 ? (
        <p className="text-white/70 text-pretty">Playlist vazia. Toque em &quot;Adicionar faixas&quot; para começar.</p>
      ) : (
        <ol aria-label="Faixas da playlist" className="flex flex-col">
          {faixas.map((f, i) => (
            <li key={f.id} className="flex min-h-16 items-center gap-2 rounded-lg px-1 py-2">
              <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-12" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{f.title}</span>
                <span className="block truncate text-sm text-white/70">{f.artistName}</span>
              </span>
              <button type="button" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label={`Subir ${f.title}`} className="flex size-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30">
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
              <button type="button" disabled={i === faixas.length - 1} onClick={() => mover(i, i + 1)} aria-label={`Descer ${f.title}`} className="flex size-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30">
                <ArrowDown className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => remover(f)} aria-label={`Remover ${f.title}`} className="flex size-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/10">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
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
            <p className="text-sm text-white/70">Faltam {MIN_FAIXAS_PUBLICAR - faixas.length} {MIN_FAIXAS_PUBLICAR - faixas.length === 1 ? "faixa" : "faixas"} para publicar.</p>
          )}
        </div>
      )}

      {painel && (
        <div role="dialog" aria-modal="true" aria-label="Adicionar faixas" className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setPainel(false)}>
          <div className="mx-auto flex max-h-[80dvh] w-full max-w-md flex-col gap-3 rounded-t-2xl bg-night-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" aria-hidden="true" />
                <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar faixa ou artista" aria-label="Buscar faixa ou artista" className={`${campo} pl-9`} autoFocus />
              </div>
              <button type="button" onClick={() => setPainel(false)} aria-label="Fechar" className="flex size-11 items-center justify-center rounded-lg hover:bg-white/10">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {resultado.length === 0 ? (
              <p className="text-sm text-white/70">Nenhuma faixa encontrada.</p>
            ) : (
              <ul className="flex flex-col overflow-y-auto">
                {resultado.map((f) => (
                  <li key={f.id} className="flex min-h-14 items-center gap-3 py-1">
                    <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{f.title}</span>
                      <span className="block truncate text-sm text-white/70">{f.artistName}</span>
                    </span>
                    <button type="button" onClick={() => adicionar(f)} aria-label={`Adicionar ${f.title}`} className="flex size-11 items-center justify-center rounded-full bg-brand text-night-900">
                      <Plus className="size-5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
