"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { FaixaDoStory } from "@/lib/stories/viewer";
import { botao, campo, Mensagem } from "@/components/ui";
import { dimensoesCapa, MAX_CAPA_ORIGINAL } from "@/lib/storage/formatos";
import { erroDoBucket } from "@/lib/storage/messages";
import { CLIP_SEGUNDOS, MAX_IMAGEM_BYTES, MAX_TEXTO } from "@/lib/stories/rules";

/** Redimensiona (lado maior ≤ 1080 px) e comprime para WebP no aparelho, abaixo do limite de stories. */
async function prepararImagem(arquivo: File): Promise<File> {
  const bmp = await createImageBitmap(arquivo);
  const { w, h } = dimensoesCapa(bmp.width, bmp.height, 1080);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  for (const q of [0.8, 0.65, 0.5, 0.35]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", q));
    if (blob && blob.type === "image/webp" && blob.size <= MAX_IMAGEM_BYTES) return new File([blob], "story.webp", { type: "image/webp" });
  }
  throw new Error("imagem");
}

export function StoryForm({ faixas }: { faixas: FaixaDoStory[] }) {
  const [texto, setTexto] = useState("");
  const [trackId, setTrackId] = useState("");
  const [msg, setMsg] = useState<{ texto: string; erro: boolean; id?: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const faixa = faixas.find((f) => f.id === trackId);
  const maxInicio = Math.max(0, (faixa?.durationSec ?? 0) - CLIP_SEGUNDOS);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    let imagem = dados.get("imagem") as File | null;
    if (imagem && imagem.size > 0) {
      if (imagem.size > MAX_CAPA_ORIGINAL) return setMsg({ texto: "A imagem passa de 15 MB. Escolha uma menor.", erro: true });
      if (!imagem.type.startsWith("image/")) return setMsg({ texto: "Imagem inválida. Use JPG, PNG ou WebP.", erro: true });
    } else imagem = null;
    setEnviando(true);
    setMsg(null);
    try {
      if (imagem) {
        try {
          imagem = await prepararImagem(imagem);
        } catch {
          return setMsg({ texto: "Não consegui ler essa imagem. Tente outra.", erro: true });
        }
      }
      const r = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: texto,
          trackId: trackId || null,
          clipStart: trackId ? Number(dados.get("inicio") ?? 0) : null,
          image: imagem ? { contentType: imagem.type, size: imagem.size } : null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg({ texto: typeof j.error === "string" ? j.error : "Não foi possível publicar agora.", erro: true });
      let aviso = "";
      if (imagem && j.imageUploadUrl) {
        const st = await fetch(j.imageUploadUrl, { method: "PUT", headers: { "Content-Type": j.imageContentType }, body: imagem }).then((x) => x.status).catch(() => 0);
        if (st >= 200 && st < 300) await fetch(`/api/stories/${j.storyId}/imagem`, { method: "POST" });
        else aviso = ` Sem a imagem: ${st ? erroDoBucket(st) : "falha de rede ou limite diário."}`;
      }
      setMsg({ texto: `Story publicado.${aviso}`, erro: false, id: j.storyId });
      setTexto("");
    } catch {
      setMsg({ texto: "Envio interrompido. Tente de novo.", erro: true });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" aria-busy={enviando}>
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Texto
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={MAX_TEXTO} rows={4} placeholder="O que você quer contar?" className={campo} />
        <span className="self-end tabular-nums">{texto.length}/{MAX_TEXTO}</span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Imagem (opcional)
        <input name="imagem" type="file" accept="image/*,.jpg,.jpeg,.png,.webp" aria-label="Imagem (opcional)" className={`${campo} text-white`} />
        <span>Reduzimos no aparelho. Sem vídeo por enquanto.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Trecho de uma faixa (opcional)
        <select value={trackId} onChange={(e) => setTrackId(e.target.value)} className={campo} aria-label="Faixa do trecho">
          <option value="">Sem trecho</option>
          {faixas.map((f) => (
            <option key={f.id} value={f.id}>{f.title} · {f.artistName}</option>
          ))}
        </select>
      </label>
      {faixa && maxInicio > 0 && (
        <label className="flex flex-col gap-1 text-sm text-white/70">
          Começa no segundo
          <input name="inicio" type="number" min={0} max={maxInicio} defaultValue={0} className={campo} aria-label="Início do trecho em segundos" />
        </label>
      )}
      <button type="submit" disabled={enviando} className={botao}>
        <Send className="size-5" aria-hidden="true" /> {enviando ? "Publicando…" : "Publicar story"}
      </button>
      {msg && <Mensagem tipo={msg.erro ? "erro" : "info"}>{msg.texto}</Mensagem>}
      {msg?.id && (
        <Link href={`/story/${msg.id}`} className="flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-2">Ver e compartilhar</Link>
      )}
    </form>
  );
}
