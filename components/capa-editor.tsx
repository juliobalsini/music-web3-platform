"use client";

import { Camera, ImagePlus, LayoutGrid, Move, Palette, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { definirCapa } from "@/app/playlist/actions";
import { PainelInferior } from "@/components/ds/interativos";
import { EstudioCapa } from "@/components/estudio-capa";
import { Mensagem, botao } from "@/components/ui";
import { LADO_CAPA, limitarEnquadramento, recorteQuadrado, urlCapaPlaylist, ZOOM_MAX, type Enquadramento } from "@/lib/playlists/capa";
import { dimensoesCapa, MAX_CAPA_ORIGINAL } from "@/lib/storage/formatos";
import { erroDaRotaDeUpload, erroDoBucket } from "@/lib/storage/messages";
import { MAX_COVER_BYTES } from "@/lib/storage/rules";

/** Foto decodificada em memória (sem URL: nada do arquivo vira atributo do DOM). */
type Foto = { bmp: ImageBitmap; w: number; h: number };

const INICIO: Enquadramento = { zoom: 1, x: 0, y: 0 };

/** Gera o JPEG quadrado no navegador; reduz a qualidade se passar do limite do bucket. */
async function gerarJpeg({ bmp, w, h }: Foto, e: Enquadramento): Promise<Blob | null> {
  const { sx, sy, lado } = recorteQuadrado(w, h, e);
  const canvas = document.createElement("canvas");
  const saida = Math.min(LADO_CAPA, Math.round(lado)) || LADO_CAPA;
  canvas.width = saida;
  canvas.height = saida;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, lado, lado, 0, 0, saida, saida);
  for (const q of [0.86, 0.72, 0.6]) {
    const b = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (b && b.size <= MAX_COVER_BYTES) return b;
  }
  return null;
}

/**
 * Capa do editor: toque abre o painel "Capa da playlist" com foto própria (recorte quadrado com zoom e arrastar,
 * gerada no navegador e enviada direto ao bucket em covers/), capa criada no mini editor (fundo, título, figurinhas;
 * PNG gerado no navegador) ou volta ao mosaico automático.
 */
export function CapaEditor({
  id,
  capa,
  titulo,
  aoMudar,
  children,
}: {
  id: string;
  capa: string | null;
  titulo: string;
  aoMudar: (url: string | null) => void;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [estudio, setEstudio] = useState(false);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [enq, setEnq] = useState<Enquadramento>(INICIO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const quadro = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const previa = useRef<HTMLCanvasElement>(null);

  // Prévia: desenha a foto (reduzida a ≤ 1600 px) no canvas do quadro.
  useEffect(() => {
    const c = previa.current;
    if (!foto || !c) return;
    const d = dimensoesCapa(foto.w, foto.h, 1600);
    c.width = d.w;
    c.height = d.h;
    c.getContext("2d")?.drawImage(foto.bmp, 0, 0, d.w, d.h);
  }, [foto]);

  /** Troca a foto em edição e libera a memória da anterior. */
  const trocarFoto = (nova: Foto | null) =>
    setFoto((velha) => {
      if (velha && velha !== nova) velha.bmp.close();
      return nova;
    });

  const fechar = () => {
    if (enviando) return;
    setAberto(false);
    setEstudio(false);
    trocarFoto(null);
    setErro(null);
  };

  const escolher = (f: File | undefined) => {
    setErro(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErro("Escolha uma imagem (JPG, PNG ou WebP).");
    if (f.size > MAX_CAPA_ORIGINAL) return setErro("Imagem grande demais. Use uma de até 15 MB.");
    createImageBitmap(f).then(
      (bmp) => { setEnq(INICIO); trocarFoto({ bmp, w: bmp.width, h: bmp.height }); },
      () => setErro("Não deu para abrir essa imagem. Tente JPG ou PNG."),
    );
  };

  const ajustar = (e: Enquadramento) => foto && setEnq(limitarEnquadramento(foto.w, foto.h, e));

  const aoTocar = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    arraste.current = { px: e.clientX, py: e.clientY, x: enq.x, y: enq.y };
  };
  const aoMover = (e: PointerEvent<HTMLDivElement>) => {
    const a = arraste.current;
    const lado = quadro.current?.clientWidth;
    if (!a || !lado) return;
    ajustar({ zoom: enq.zoom, x: a.x + (e.clientX - a.px) / lado, y: a.y + (e.clientY - a.py) / lado });
  };
  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = 0.04;
    const d: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    const m = d[e.key];
    if (m) { e.preventDefault(); ajustar({ zoom: enq.zoom, x: enq.x + m[0], y: enq.y + m[1] }); }
    if (e.key === "+" || e.key === "=") ajustar({ ...enq, zoom: enq.zoom + 0.1 });
    if (e.key === "-") ajustar({ ...enq, zoom: enq.zoom - 0.1 });
  };

  const salvar = async (key: string | null) => {
    const r = await definirCapa(id, key);
    if (!r.ok) return setErro(r.erro);
    aoMudar(urlCapaPlaylist(id, key));
    setAberto(false);
    setEstudio(false);
    trocarFoto(null);
  };

  /** Pede a URL assinada, envia a imagem direto ao bucket (covers/) e grava a capa. */
  const enviar = async (img: Blob) => {
    setEnviando(true);
    setErro(null);
    try {
      const tipo = img.type || "image/jpeg";
      const res = await fetch(`/api/playlists/${id}/capa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: tipo, size: img.size }),
      });
      const dados = (await res.json().catch(() => ({}))) as { url?: string; key?: string; error?: string };
      if (!res.ok || !dados.url || !dados.key) return setErro(erroDaRotaDeUpload(res.status, dados.error));
      const put = await fetch(dados.url, { method: "PUT", headers: { "Content-Type": tipo }, body: img }).catch(() => null);
      if (!put) return setErro("Sem conexão com o armazenamento. Tente de novo em instantes.");
      if (!put.ok) return setErro(erroDoBucket(put.status));
      await salvar(dados.key);
    } finally {
      setEnviando(false);
    }
  };

  const usar = async () => {
    if (!foto) return;
    const jpeg = await gerarJpeg(foto, enq);
    if (!jpeg) return setErro("Não deu para preparar a imagem. Tente outra.");
    await enviar(jpeg);
  };

  const voltarAoMosaico = async () => {
    setEnviando(true);
    setErro(null);
    try { await salvar(null); } finally { setEnviando(false); }
  };

  const w = foto?.w ?? 1;
  const h = foto?.h ?? 1;
  const menor = Math.min(w, h);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Trocar capa da playlist"
        className="group relative shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        data-testid="trocar-capa"
      >
        {children}
        <span className="absolute -bottom-1.5 -right-1.5 grid size-9 place-items-center rounded-full bg-brand text-night-900 shadow-[0_2px_8px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-out group-active:scale-90" aria-hidden="true">
          <Camera className="size-4" />
        </span>
      </button>

      <PainelInferior aberto={aberto} aoFechar={fechar} titulo="Capa da playlist">
        <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />

        {estudio ? (
          <EstudioCapa titulo={titulo} enviando={enviando} erro={erro} aoUsar={enviar} aoVoltar={() => { setEstudio(false); setErro(null); }} />
        ) : foto ? (
          <div className="flex flex-col gap-4">
            <div
              ref={quadro}
              role="img"
              tabIndex={0}
              aria-label="Enquadramento da capa. Arraste ou use as setas para mover; + e − para aproximar."
              onPointerDown={aoTocar}
              onPointerMove={aoMover}
              onPointerUp={() => { arraste.current = null; }}
              onPointerCancel={() => { arraste.current = null; }}
              onKeyDown={aoTeclar}
              className="relative mx-auto aspect-square w-full max-w-72 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-black/40 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              data-testid="quadro-capa"
            >
              <canvas
                ref={previa}
                aria-hidden="true"
                className="pointer-events-none absolute max-w-none"
                style={{
                  width: `${(w / menor) * enq.zoom * 100}%`,
                  height: `${(h / menor) * enq.zoom * 100}%`,
                  left: `${50 + enq.x * 100}%`,
                  top: `${50 + enq.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
              {/* Grade de terços: ajuda a enquadrar, some ao salvar (não vai para a imagem). */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => <span key={i} className="border-[0.5px] border-white/20" />)}
              </div>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-sm text-[var(--ds-texto-2)]">
              <Move className="size-4" aria-hidden="true" /> Arraste para enquadrar
            </p>
            <label className="flex items-center gap-3">
              <ZoomOut className="size-5 shrink-0 text-[var(--ds-texto-2)]" aria-hidden="true" />
              <span className="sr-only">Zoom</span>
              <input
                type="range"
                min={1}
                max={ZOOM_MAX}
                step={0.01}
                value={enq.zoom}
                onChange={(e) => ajustar({ ...enq, zoom: Number(e.target.value) })}
                className="h-11 w-full accent-[var(--color-brand)]"
              />
              <ZoomIn className="size-5 shrink-0 text-[var(--ds-texto-2)]" aria-hidden="true" />
            </label>
            {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
            <button type="button" onClick={usar} disabled={enviando} className={botao} data-testid="usar-capa">
              {enviando ? "Enviando…" : "Usar esta capa"}
            </button>
            <button type="button" onClick={() => arquivo.current?.click()} disabled={enviando} className="min-h-11 rounded-lg font-semibold text-[var(--ds-texto)] underline-offset-4 hover:underline disabled:opacity-60">
              Escolher outra foto
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => arquivo.current?.click()} className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--ds-surface)] px-4 text-left font-semibold transition-colors hover:bg-[var(--ds-surface-2)]" data-testid="escolher-foto">
              <ImagePlus className="size-5 shrink-0 text-brand" aria-hidden="true" /> Escolher foto
            </button>
            <button type="button" onClick={() => { setErro(null); setEstudio(true); }} className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--ds-surface)] px-4 text-left font-semibold transition-colors hover:bg-[var(--ds-surface-2)]" data-testid="criar-capa">
              <Palette className="size-5 shrink-0 text-brand" aria-hidden="true" /> Criar capa
            </button>
            {capa && (
              <button type="button" onClick={voltarAoMosaico} disabled={enviando} className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--ds-surface)] px-4 text-left font-semibold transition-colors hover:bg-[var(--ds-surface-2)] disabled:opacity-60" data-testid="voltar-mosaico">
                <LayoutGrid className="size-5 shrink-0 text-brand" aria-hidden="true" /> Usar o mosaico das faixas
              </button>
            )}
            {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          </div>
        )}
      </PainelInferior>
    </>
  );
}
