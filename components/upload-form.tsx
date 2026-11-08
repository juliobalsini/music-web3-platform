"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

const campo =
  "w-full rounded-lg bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-brand";

export function UploadForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = new FormData(form);
    const arquivo = dados.get("arquivo") as File | null;
    if (!arquivo || arquivo.size === 0) return setMsg("Escolha um arquivo de áudio.");
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
      if (!r.ok) return setMsg(j.error ?? "Falha no envio.");
      const put = await fetch(j.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": j.contentType },
        body: arquivo,
      });
      if (!put.ok) return setMsg("O envio ao armazenamento falhou. Tente de novo.");
      const pub = await fetch(`/api/tracks/${j.trackId}/publish`, { method: "POST" });
      setMsg(pub.ok ? "Faixa publicada." : "Enviada, mas não foi possível publicar.");
    } catch {
      setMsg("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <input name="titulo" required maxLength={200} placeholder="Título" aria-label="Título" className={campo} />
      <input
        name="arquivo"
        type="file"
        required
        accept="audio/mpeg,audio/mp4,audio/ogg,audio/flac"
        aria-label="Arquivo de áudio (até 25 MB)"
        className={campo}
      />
      <label className="flex items-center gap-3 text-white/80">
        <input name="direitos" type="checkbox" required className="size-5 accent-[#ff6b35]" />
        Tenho os direitos desta faixa
      </label>
      <button
        type="submit"
        disabled={enviando}
        className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand to-brand-2 px-6 py-3 font-semibold text-night-900 transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
      >
        <Upload className="size-5" /> {enviando ? "Enviando…" : "Enviar"}
      </button>
      {msg && <p role="status" className="text-brand-2">{msg}</p>}
    </form>
  );
}
