"use client";

import {
  AudioWaveform, Disc3, Drum, Guitar, Headphones, Heart, MicVocal, Music, Music2, Piano, Radio, Sparkles, Trash2, Type,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Abas } from "@/components/ds/interativos";
import { Mensagem, botao } from "@/components/ui";
import { fonteCartaz, fonteSerifa } from "@/lib/fontes-capa";
import { LADO_CAPA } from "@/lib/playlists/capa";
import {
  adicionarFigurinha, atualizarCamada, composicaoInicial, desenharCapa, desenharSoFundo, ESCALA_MAX, ESCALA_MIN, FONTES, FUNDOS,
  MAX_FIGURINHAS, MAX_TITULO, NOMES_FIGURINHAS, removerFigurinha,
  type Caixa, type Composicao, type FigurinhaId, type FonteId,
} from "@/lib/playlists/estudio-capa";
import { MAX_COVER_BYTES } from "@/lib/storage/rules";

const ICONES: Record<FigurinhaId, LucideIcon> = {
  nota: Music, colcheia: Music2, vinil: Disc3, fones: Headphones, microfone: MicVocal, guitarra: Guitar,
  piano: Piano, tambor: Drum, radio: Radio, onda: AudioWaveform, coracao: Heart, brilho: Sparkles,
};

/** Lado interno da prévia (px). A imagem final usa LADO_CAPA com o mesmo desenho. */
const LADO_PREVIA = 720;

type Aba = "fundo" | "texto" | "figurinhas";

function familias(): Record<FonteId, string> {
  const geist = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim();
  return {
    geist: geist || "system-ui, sans-serif",
    serifa: fonteSerifa.style.fontFamily,
    cartaz: fonteCartaz.style.fontFamily,
  };
}

/** PNG gerado no navegador; se passar do limite do bucket (raro), cai para JPEG. */
async function gerarImagem(c: Composicao): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = LADO_CAPA;
  canvas.height = LADO_CAPA;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  desenharCapa(ctx, c, LADO_CAPA, familias());
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (png && png.size <= MAX_COVER_BYTES) return png;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  return jpeg && jpeg.size <= MAX_COVER_BYTES ? jpeg : null;
}

function Amostra({ fundo }: { fundo: (typeof FUNDOS)[number]["id"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) desenharSoFundo(ctx, fundo, 96);
  }, [fundo]);
  return <canvas ref={ref} width={96} height={96} aria-hidden="true" className="size-full rounded-[inherit]" />;
}

/**
 * Mini editor de capa: fundo da marca, título em 3 fontes e figurinhas que se arrastam e redimensionam
 * sobre a prévia. "Usar esta capa" gera a imagem no navegador (canvas) e devolve ao painel para o envio.
 */
export function EstudioCapa({
  titulo,
  enviando,
  erro,
  aoUsar,
  aoVoltar,
}: {
  titulo: string;
  enviando: boolean;
  erro: string | null;
  aoUsar: (img: Blob) => void;
  aoVoltar: () => void;
}) {
  const [comp, setComp] = useState<Composicao>(() => composicaoInicial(titulo || "Minha playlist"));
  const [aba, setAba] = useState<Aba>("fundo");
  const [sel, setSel] = useState<string | null>(null);
  const [caixas, setCaixas] = useState<Record<string, Caixa>>({});
  const [fontesProntas, setFontesProntas] = useState(0);
  const [falha, setFalha] = useState<string | null>(null);
  const previa = useRef<HTMLCanvasElement>(null);
  const quadro = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // Carrega a fonte escolhida antes de desenhar (o canvas não espera o @font-face sozinho).
  useEffect(() => {
    const f = FONTES.find((x) => x.id === comp.fonte) ?? FONTES[0];
    let vivo = true;
    document.fonts?.load(`${f.peso} 48px ${familias()[f.id]}`).then(
      () => vivo && setFontesProntas((n) => n + 1),
      () => undefined,
    );
    return () => { vivo = false; };
  }, [comp.fonte]);

  useEffect(() => {
    const ctx = previa.current?.getContext("2d");
    if (ctx) setCaixas(desenharCapa(ctx, comp, LADO_PREVIA, familias()));
  }, [comp, fontesProntas]);

  const mudar = (alvo: string, f: (k: { x: number; y: number; escala: number }) => { x: number; y: number; escala: number }) =>
    setComp((c) => atualizarCamada(c, alvo, f));

  const camada = (alvo: string) => (alvo === "titulo" ? comp.titulo : comp.figurinhas.find((f) => f.uid === alvo));
  const selecionada = sel ? camada(sel) : undefined;

  const aoTocar = (alvo: string) => (e: PointerEvent<HTMLButtonElement>) => {
    const k = camada(alvo);
    if (!k) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSel(alvo);
    arraste.current = { px: e.clientX, py: e.clientY, x: k.x, y: k.y };
  };
  const aoMover = (alvo: string) => (e: PointerEvent<HTMLButtonElement>) => {
    const a = arraste.current;
    const lado = quadro.current?.clientWidth;
    if (!a || !lado) return;
    mudar(alvo, (k) => ({ ...k, x: a.x + (e.clientX - a.px) / lado, y: a.y + (e.clientY - a.py) / lado }));
  };
  const soltar = () => { arraste.current = null; };

  const remover = (uid: string) => {
    setComp((c) => removerFigurinha(c, uid));
    setSel(null);
  };

  const aoTeclar = (alvo: string) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const p = 0.02;
    const d: Record<string, [number, number]> = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] };
    const m = d[e.key];
    if (m) { e.preventDefault(); mudar(alvo, (k) => ({ ...k, x: k.x + m[0], y: k.y + m[1] })); }
    if (e.key === "+" || e.key === "=") mudar(alvo, (k) => ({ ...k, escala: k.escala + 0.1 }));
    if (e.key === "-") mudar(alvo, (k) => ({ ...k, escala: k.escala - 0.1 }));
    if ((e.key === "Delete" || e.key === "Backspace") && alvo !== "titulo") { e.preventDefault(); remover(alvo); }
  };

  const colar = (nome: FigurinhaId) => {
    const r = adicionarFigurinha(comp, nome);
    if (!r.uid) return;
    setComp(r.comp);
    setSel(r.uid);
  };

  const usar = async () => {
    setFalha(null);
    const img = await gerarImagem(comp);
    if (!img) return setFalha("Não deu para gerar a imagem. Tente de novo.");
    aoUsar(img);
  };

  const alvos = [...comp.figurinhas.map((f) => ({ id: f.uid, rotulo: `Figurinha ${NOMES_FIGURINHAS[f.nome]}` })), { id: "titulo", rotulo: "Título" }];

  return (
    <div className="flex flex-col gap-4" data-testid="estudio-capa">
      <div
        ref={quadro}
        onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}
        className="relative mx-auto aspect-square w-full max-w-72 touch-none select-none overflow-hidden rounded-xl bg-fundo-2 shadow-[0_8px_24px_rgb(0_0_0/0.4)]"
      >
        <canvas ref={previa} width={LADO_PREVIA} height={LADO_PREVIA} role="img" aria-label="Prévia da capa" className="pointer-events-none size-full" data-testid="previa-estudio" />
        {alvos.map(({ id, rotulo }) => {
          const c = caixas[id];
          if (!c) return null;
          const ativa = sel === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={`${rotulo}. Arraste ou use as setas para mover; + e − para mudar o tamanho.`}
              aria-pressed={ativa}
              onPointerDown={aoTocar(id)}
              onPointerMove={aoMover(id)}
              onPointerUp={soltar}
              onPointerCancel={soltar}
              onKeyDown={aoTeclar(id)}
              onFocus={() => setSel(id)}
              className={`absolute cursor-grab rounded-md outline-offset-2 active:cursor-grabbing ${
                ativa ? "outline-2 outline-dashed outline-brand-2" : "outline-none focus-visible:outline-2 focus-visible:outline-brand"
              }`}
              style={{ left: `${(c.x - 0.015) * 100}%`, top: `${(c.y - 0.015) * 100}%`, width: `${(c.w + 0.03) * 100}%`, height: `${(c.h + 0.03) * 100}%` }}
            />
          );
        })}
      </div>

      <div className="flex min-h-11 items-center gap-3">
        {selecionada && sel ? (
          <>
            <label className="flex flex-1 items-center gap-3 text-sm text-[var(--ds-texto-2)]">
              Tamanho
              <input
                type="range"
                min={ESCALA_MIN}
                max={ESCALA_MAX}
                step={0.01}
                value={selecionada.escala}
                onChange={(e) => mudar(sel, (k) => ({ ...k, escala: Number(e.target.value) }))}
                className="h-11 w-full accent-[var(--color-brand)]"
                data-testid="tamanho-camada"
              />
            </label>
            {sel !== "titulo" && (
              <button type="button" onClick={() => remover(sel)} aria-label="Remover figurinha" className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--ds-surface)] text-[var(--ds-texto)] transition-colors hover:bg-[var(--ds-surface-2)]">
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            )}
          </>
        ) : (
          <p className="w-full text-center text-sm text-[var(--ds-texto-2)]">Toque no título ou numa figurinha para mover</p>
        )}
      </div>

      <Abas<Aba>
        rotulo="Editar capa"
        opcoes={[{ id: "fundo", rotulo: "Fundo" }, { id: "texto", rotulo: "Texto" }, { id: "figurinhas", rotulo: "Figurinhas" }]}
        valor={aba}
        aoMudar={setAba}
      />

      {aba === "fundo" && (
        <div role="radiogroup" aria-label="Fundo" className="grid grid-cols-6 gap-2">
          {FUNDOS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={comp.fundo === f.id}
              aria-label={f.nome}
              onClick={() => setComp((c) => ({ ...c, fundo: f.id }))}
              className={`aspect-square rounded-lg transition-transform duration-150 ease-out active:scale-90 ${
                comp.fundo === f.id ? "ring-2 ring-brand ring-offset-2 ring-offset-[var(--ds-bg)]" : ""
              }`}
            >
              <Amostra fundo={f.id} />
            </button>
          ))}
        </div>
      )}

      {aba === "texto" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 rounded-lg bg-[var(--ds-surface)] px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--ds-destaque)]">
            <Type className="size-5 shrink-0 text-[var(--ds-texto-2)]" aria-hidden="true" />
            <span className="sr-only">Texto da capa</span>
            <input
              value={comp.texto}
              maxLength={MAX_TITULO}
              name="texto-capa"
              autoComplete="off"
              onChange={(e) => setComp((c) => ({ ...c, texto: e.target.value }))}
              className="min-h-11 w-full bg-transparent outline-none"
              data-testid="texto-capa"
            />
          </label>
          <div role="radiogroup" aria-label="Fonte" className="grid grid-cols-3 gap-2">
            {FONTES.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={comp.fonte === f.id}
                onClick={() => setComp((c) => ({ ...c, fonte: f.id }))}
                className={`flex min-h-16 flex-col items-center justify-center rounded-lg transition-colors ${
                  comp.fonte === f.id ? "bg-[var(--ds-destaque)] text-[var(--ds-sobre-destaque)]" : "bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-2)]"
                }`}
              >
                <span className="text-2xl leading-none" style={{ fontFamily: familias()[f.id], fontWeight: f.peso }}>
                  {f.caixaAlta ? "AA" : "Aa"}
                </span>
                <span className="mt-1 text-xs font-semibold">{f.nome}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {aba === "figurinhas" && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-6 gap-2">
            {(Object.keys(ICONES) as FigurinhaId[]).map((nome) => {
              const Icone = ICONES[nome];
              return (
                <button
                  key={nome}
                  type="button"
                  onClick={() => colar(nome)}
                  disabled={comp.figurinhas.length >= MAX_FIGURINHAS}
                  aria-label={`Colar ${NOMES_FIGURINHAS[nome]}`}
                  className="grid aspect-square place-items-center rounded-lg bg-[var(--ds-surface)] text-brand transition-[transform,background-color] duration-150 ease-out hover:bg-[var(--ds-surface-2)] active:scale-90 disabled:opacity-40"
                  data-testid={`figurinha-${nome}`}
                >
                  <Icone className="size-6" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          {comp.figurinhas.length >= MAX_FIGURINHAS && (
            <p className="text-sm text-[var(--ds-texto-2)]">Até {MAX_FIGURINHAS} figurinhas por capa.</p>
          )}
        </div>
      )}

      {(falha || erro) && <Mensagem tipo="erro">{falha ?? erro}</Mensagem>}
      <button type="button" onClick={usar} disabled={enviando} className={botao} data-testid="usar-estudio">
        {enviando ? "Enviando…" : "Usar esta capa"}
      </button>
      <button type="button" onClick={aoVoltar} disabled={enviando} className="min-h-11 rounded-lg font-semibold text-[var(--ds-texto)] underline-offset-4 hover:underline disabled:opacity-60">
        Voltar
      </button>
    </div>
  );
}
