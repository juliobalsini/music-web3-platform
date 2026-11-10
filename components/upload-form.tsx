"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { botao, campo, Mensagem } from "@/components/ui";


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
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/tracks/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dados.get("titulo"),
          contentType: arquivo.type,
          size: arquivo.size,
          rightsConfirmed: dados.get("direitos") === "on",
          durationSec: null,
        }),
      });
      const j = await r.json();
      if (!r.ok) return falha(j.error ?? "Falha no envio.");
      const put = await fetch(j.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": j.contentType },
        body: arquivo,
      });
      if (!put.ok) return falha("O envio ao armazenamento falhou. Tente de novo.");
      const pub = await fetch(`/api/tracks/${j.trackId}/publish`, { method: "POST" });
      if (pub.ok) setMsg({ texto: "Faixa publicada.", erro: false });
      else falha("Enviada, mas não foi possível publicar.");
    } catch {
      falha("Sem conexão. Tente de novo.");
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
      <label className="flex min-h-11 items-center gap-3 text-white/80">
        <input name="direitos" type="checkbox" required className="size-5 accent-[#ff6b35]" />
        Tenho os direitos desta faixa
      </label>
      <button type="submit" disabled={enviando} className={botao}>
        <Upload className="size-5" aria-hidden="true" /> {enviando ? "Enviando…" : "Enviar"}
      </button>
      {msg && <Mensagem tipo={msg.erro ? "erro" : "info"}>{msg.texto}</Mensagem>}
    </form>
  );
}
