"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { botao, campo, Mensagem } from "@/components/ui";
import { erroDaRotaDeUpload, erroDoBucket } from "@/lib/storage/messages";


/** Duração lida do próprio arquivo, no navegador (sem requisição ao bucket). */
function lerDuracao(arquivo: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const el = new Audio();
    const fim = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => fim(Number.isFinite(el.duration) && el.duration >= 1 ? Math.round(el.duration) : null);
    el.onerror = () => fim(null);
    el.src = url;
  });
}

const ficha = [
  { name: "composer", label: "Compositor", max: 120 },
  { name: "performers", label: "Intérpretes", max: 200 },
  { name: "album", label: "Álbum", max: 120 },
  { name: "label", label: "Selo", max: 120 },
] as const;

export function UploadForm() {
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const falha = (texto: string) => setMsg({ texto, erro: true });

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = new FormData(form);
    const arquivo = dados.get("arquivo") as File | null;
    if (!arquivo || arquivo.size === 0) return falha("Escolha um arquivo de áudio.");
    const capa = dados.get("capa") as File | null;
    const temCapa = !!capa && capa.size > 0;
    if (temCapa && !["image/jpeg", "image/png", "image/webp"].includes(capa.type)) return falha("Capa inválida. Use JPG, PNG ou WebP.");
    if (temCapa && capa.size > 2 * 1024 * 1024) return falha("A capa passa de 2 MB. Escolha uma menor.");
    setEnviando(true);
    setMsg(null);
    try {
      const durationSec = await lerDuracao(arquivo);
      const r = await fetch("/api/tracks/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dados.get("titulo"),
          contentType: arquivo.type,
          size: arquivo.size,
          rightsConfirmed: dados.get("direitos") === "on",
          durationSec,
          cover: temCapa ? { contentType: capa.type, size: capa.size } : null,
          credits: Object.fromEntries(ficha.map((f) => [f.name, String(dados.get(f.name) ?? "")])),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return falha(erroDaRotaDeUpload(r.status, j.error));
      const put = await fetch(j.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": j.contentType },
        body: arquivo,
      });
      if (!put.ok) return falha(erroDoBucket(put.status));
      // Capa é opcional: se falhar, a faixa sai sem capa (arte gerada do título).
      let coverOk = true;
      if (temCapa && j.coverUploadUrl) {
        coverOk = await fetch(j.coverUploadUrl, { method: "PUT", headers: { "Content-Type": j.coverContentType }, body: capa })
          .then((r) => r.ok)
          .catch(() => false);
      }
      const pub = await fetch(`/api/tracks/${j.trackId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverOk }),
      });
      if (pub.ok) setMsg({ texto: coverOk ? "Faixa publicada." : "Faixa publicada, mas sem a capa. Use uma imagem menor depois.", erro: false });
      else falha("Enviada, mas não publicada. Tente enviar de novo.");
    } catch {
      // Erro de rede no PUT também acontece quando o B2 recusa por cota (sem CORS na resposta).
      falha(
        navigator.onLine
          ? "Envio interrompido. Pode ser o limite diário ou a conexão. Tente mais tarde."
          : "Sem conexão. Confira a internet e tente de novo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" aria-busy={enviando}>
      <input name="titulo" required maxLength={200} placeholder="Título" aria-label="Título" className={campo} />
      <input
        name="arquivo"
        type="file"
        required
        accept="audio/mpeg,audio/mp4,audio/ogg,audio/flac"
        aria-label="Arquivo de áudio (até 25 MB)"
        className={campo}
      />
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Capa (opcional)
        <input
          name="capa"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Capa (opcional, até 2 MB)"
          className={`${campo} text-white`}
        />
        <span>Sem capa, geramos uma arte a partir do título.</span>
      </label>
      <details className="group rounded-lg bg-white/5 px-4 py-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold">
          Ficha técnica (opcional)
        </summary>
        <div className="flex flex-col gap-3 pb-3">
          {ficha.map((f) => (
            <input key={f.name} name={f.name} maxLength={f.max} placeholder={f.label} aria-label={f.label} className={campo} />
          ))}
        </div>
      </details>
      <label className="flex min-h-11 items-center gap-3 text-white/80">
        <input name="direitos" type="checkbox" required className="size-5 accent-[#e89a3c]" />
        Tenho os direitos desta faixa
      </label>
      <button type="submit" disabled={enviando} className={botao}>
        <Upload className="size-5" aria-hidden="true" /> {enviando ? "Enviando…" : "Enviar"}
      </button>
      {msg && <Mensagem tipo={msg.erro ? "erro" : "info"}>{msg.texto}</Mensagem>}
    </form>
  );
}
