"use client";

import { Move, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Mensagem, botao } from "@/components/ui";
import { LADO_CAPA, limitarEnquadramento, recorteQuadrado, ZOOM_MAX, type Enquadramento } from "@/lib/playlists/capa";
import { dimensoesCapa, MAX_CAPA_ORIGINAL } from "@/lib/storage/formatos";
import { erroDaRotaDeUpload, erroDoBucket } from "@/lib/storage/messages";
import { MAX_COVER_BYTES } from "@/lib/storage/rules";

// Recorte quadrado de foto (capa de playlist e foto do perfil): abrir, enquadrar, gerar JPEG e enviar ao bucket.

/** Foto decodificada em memória (sem URL: nada do arquivo vira atributo do DOM). */
export type Foto = { bmp: ImageBitmap; w: number; h: number };

const INICIO: Enquadramento = { zoom: 1, x: 0, y: 0 };

/** Abre o arquivo escolhido; devolve a foto ou a mensagem de erro. */
export async function abrirFoto(f: File): Promise<Foto | string> {
  if (!f.type.startsWith("image/")) return "Escolha uma imagem (JPG, PNG ou WebP).";
  if (f.size > MAX_CAPA_ORIGINAL) return "Imagem grande demais. Use uma de até 15 MB.";
  try {
    const bmp = await createImageBitmap(f);
    return { bmp, w: bmp.width, h: bmp.height };
  } catch {
    return "Não deu para abrir essa imagem. Tente JPG ou PNG.";
  }
}

/** Gera o JPEG quadrado no navegador; reduz a qualidade se passar do limite do bucket. */
async function gerarJpeg({ bmp, w, h }: Foto, e: Enquadramento, ladoMax: number): Promise<Blob | null> {
  const { sx, sy, lado } = recorteQuadrado(w, h, e);
  const canvas = document.createElement("canvas");
  const saida = Math.min(ladoMax, Math.round(lado)) || ladoMax;
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

/** Pede a URL assinada à rota (POST), envia a imagem direto ao bucket e devolve a chave. */
export async function enviarImagem(rota: string, img: Blob): Promise<{ key: string } | { erro: string }> {
  const tipo = img.type || "image/jpeg";
  const res = await fetch(rota, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: tipo, size: img.size }),
  }).catch(() => null);
  if (!res) return { erro: "Sem conexão. Tente de novo em instantes." };
  const dados = (await res.json().catch(() => ({}))) as { url?: string; key?: string; error?: string };
  if (!res.ok || !dados.url || !dados.key) return { erro: erroDaRotaDeUpload(res.status, dados.error) };
  const put = await fetch(dados.url, { method: "PUT", headers: { "Content-Type": tipo }, body: img }).catch(() => null);
  if (!put) return { erro: "Sem conexão com o armazenamento. Tente de novo em instantes." };
  if (!put.ok) return { erro: erroDoBucket(put.status) };
  return { key: dados.key };
}

/**
 * Quadro de enquadramento (arrastar, setas, zoom) + "usar" e "escolher outra". `redondo` mostra a máscara
 * circular da foto de perfil (a imagem salva continua quadrada).
 */
export function RecorteFoto({
  foto,
  rotulo,
  usar,
  enviando,
  erro,
  aoUsar,
  aoTrocar,
  redondo = false,
  ladoMax = LADO_CAPA,
}: {
  foto: Foto;
  rotulo: string;
  usar: string;
  enviando: boolean;
  erro: string | null;
  aoUsar: (jpeg: Blob | null) => void;
  aoTrocar: () => void;
  redondo?: boolean;
  ladoMax?: number;
}) {
  const [enq, setEnq] = useState<Enquadramento>(INICIO);
  const [fotoAnterior, setFotoAnterior] = useState(foto);
  if (fotoAnterior !== foto) {
    // Foto nova: volta ao enquadramento inicial (ajuste durante a renderização, sem efeito).
    setFotoAnterior(foto);
    setEnq(INICIO);
  }
  const quadro = useRef<HTMLDivElement>(null);
  const previa = useRef<HTMLCanvasElement>(null);
  const arraste = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // Desenha a prévia (reduzida a ≤ 1600 px) no canvas do quadro.
  useEffect(() => {
    const c = previa.current;
    if (!c) return;
    const d = dimensoesCapa(foto.w, foto.h, 1600);
    c.width = d.w;
    c.height = d.h;
    c.getContext("2d")?.drawImage(foto.bmp, 0, 0, d.w, d.h);
  }, [foto]);

  const ajustar = (e: Enquadramento) => setEnq(limitarEnquadramento(foto.w, foto.h, e));

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

  const menor = Math.min(foto.w, foto.h);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={quadro}
        role="img"
        tabIndex={0}
        aria-label={`${rotulo}. Arraste ou use as setas para mover; + e − para aproximar.`}
        onPointerDown={aoTocar}
        onPointerMove={aoMover}
        onPointerUp={() => { arraste.current = null; }}
        onPointerCancel={() => { arraste.current = null; }}
        onKeyDown={aoTeclar}
        className={`relative mx-auto aspect-square w-full max-w-72 cursor-grab touch-none select-none overflow-hidden bg-black/40 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${redondo ? "rounded-full" : "rounded-xl"}`}
        data-testid="quadro-capa"
      >
        <canvas
          ref={previa}
          aria-hidden="true"
          className="pointer-events-none absolute max-w-none"
          style={{
            width: `${(foto.w / menor) * enq.zoom * 100}%`,
            height: `${(foto.h / menor) * enq.zoom * 100}%`,
            left: `${50 + enq.x * 100}%`,
            top: `${50 + enq.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
        {/* Grade de terços: ajuda a enquadrar, some ao salvar (não vai para a imagem). */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => <span key={i} className="border-[0.5px] border-tinta/20" />)}
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
      <button type="button" onClick={async () => aoUsar(await gerarJpeg(foto, enq, ladoMax))} disabled={enviando} className={botao} data-testid="usar-capa">
        {enviando ? "Enviando…" : usar}
      </button>
      <button type="button" onClick={aoTrocar} disabled={enviando} className="min-h-11 rounded-lg font-semibold text-[var(--ds-texto)] underline-offset-4 hover:underline disabled:opacity-60">
        Escolher outra foto
      </button>
    </div>
  );
}
