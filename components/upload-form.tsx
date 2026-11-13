"use client";

import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { botao, campo, Mensagem } from "@/components/ui";
import { CLIMAS, GENEROS } from "@/lib/radio/generos";
import { ACCEPT_AUDIO, dimensoesCapa, MAX_CAPA_ORIGINAL, tipoDeAudio } from "@/lib/storage/formatos";
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

/** Redimensiona (lado maior ≤ 1200 px) e comprime para WebP no aparelho, abaixo de 1,5 MB. */
async function prepararCapa(arquivo: File): Promise<File> {
  const bmp = await createImageBitmap(arquivo);
  const { w, h } = dimensoesCapa(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", q));
    if (blob && blob.type === "image/webp" && blob.size <= 1.5 * 1024 * 1024) return new File([blob], "capa.webp", { type: "image/webp" });
  }
  throw new Error("capa");
}

function chaveDoEnvio(ref: { current: { assinatura: string; chave: string } | null }, assinatura: string): string {
  if (ref.current?.assinatura !== assinatura) ref.current = { assinatura, chave: crypto.randomUUID().replace(/-/g, "") };
  return ref.current.chave;
}

/** PUT com progresso (fetch não expõe o progresso do envio). */
function enviarComProgresso(url: string, tipo: string, corpo: Blob, aoProgredir: (frac: number) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", tipo);
    x.upload.onprogress = (e) => e.lengthComputable && aoProgredir(e.loaded / e.total);
    x.onload = () => resolve(x.status);
    x.onerror = () => reject(new Error("rede"));
    x.send(corpo);
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
  const [progresso, setProgresso] = useState<{ rotulo: string; frac: number } | null>(null);
  const [modo, setModo] = useState<"single" | "album">("single");
  const [faixasAlbum, setFaixasAlbum] = useState<{ arquivo: File; titulo: string }[]>([]);

  // Trava síncrona contra toque repetido (o estado `enviando` só atualiza no próximo render) e chave de idempotência por envio.
  const emCurso = useRef(false);
  const chaveEnvio = useRef<{ assinatura: string; chave: string } | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);

  // Áudio compartilhado de outro app (Web Share Target): o service worker guardou o arquivo.
  useEffect(() => {
    if (!("caches" in window)) return;
    const aviso = new URLSearchParams(window.location.search).get("compartilhado");
    void (async () => {
      if (aviso === "0") {
        setMsg({ texto: "Não recebi o arquivo compartilhado. Escolha o áudio aqui.", erro: true });
        return;
      }
      const cache = await caches.open("radioon-share-v1");
      const r = await cache.match("/__compartilhado");
      if (!r) return;
      const nome = decodeURIComponent(r.headers.get("X-Nome") ?? "faixa");
      const arq = new File([await r.blob()], nome, { type: r.headers.get("Content-Type") ?? "" });
      await cache.delete("/__compartilhado");
      if (!arquivoRef.current) return;
      const dt = new DataTransfer();
      dt.items.add(arq);
      arquivoRef.current.files = dt.files;
      if (tituloRef.current && !tituloRef.current.value) {
        tituloRef.current.value = decodeURIComponent(r.headers.get("X-Titulo") ?? "") || nome.replace(/\.[^.]+$/, "");
      }
      setMsg({ texto: `Recebi “${nome}”. Confira o título e envie.`, erro: false });
    })();
  }, []);

  const falha = (texto: string) => setMsg({ texto, erro: true });

  /** Álbum/EP: uma capa única, várias faixas; cada faixa sobe e é publicada em seguida. */
  async function enviarAlbum(dados: FormData) {
    if (faixasAlbum.length < 2) return falha("Escolha pelo menos 2 faixas para o álbum ou EP.");
    if (faixasAlbum.length > 20) return falha("Máximo de 20 faixas por álbum.");
    const tipos: string[] = [];
    for (const f of faixasAlbum) {
      const t = tipoDeAudio(f.arquivo.name, f.arquivo.type);
      if (!t) return falha(`Formato não aceito em “${f.arquivo.name}”. Use MP3, M4A, AAC, OGG, FLAC, WAV ou MP4.`);
      if (f.arquivo.size > 25 * 1024 * 1024) return falha(`“${f.arquivo.name}” passa de 25 MB.`);
      if (!f.titulo.trim()) return falha("Dê um título a cada faixa.");
      tipos.push(t);
    }
    let capa = dados.get("capa") as File | null;
    if (capa && capa.size > 0) {
      if (capa.size > MAX_CAPA_ORIGINAL) return falha("A capa passa de 15 MB. Escolha uma menor.");
      if (!capa.type.startsWith("image/")) return falha("Capa inválida. Use uma imagem (JPG, PNG ou WebP).");
    } else capa = null;
    setEnviando(true);
    setMsg(null);
    try {
      if (capa) {
        setProgresso({ rotulo: "Preparando a capa…", frac: 0 });
        try {
          capa = await prepararCapa(capa);
        } catch {
          return falha("Não consegui ler essa capa. Tente outra imagem (JPG, PNG ou WebP).");
        }
      }
      const duracoes = await Promise.all(faixasAlbum.map((f) => lerDuracao(f.arquivo)));
      const r = await fetch("/api/albums/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dados.get("titulo-album"),
          kind: dados.get("tipo"),
          rightsConfirmed: dados.get("direitos") === "on",
          genre: String(dados.get("genero") ?? ""),
          mood: String(dados.get("clima") ?? ""),
          cover: capa ? { contentType: capa.type, size: capa.size } : null,
          faixas: faixasAlbum.map((f, i) => ({ title: f.titulo, contentType: tipos[i], size: f.arquivo.size, durationSec: duracoes[i] })),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return falha(erroDaRotaDeUpload(r.status, j.error));
      let coverOk = true;
      if (capa && j.coverUploadUrl) {
        setProgresso({ rotulo: "Enviando a capa…", frac: 0 });
        coverOk = await enviarComProgresso(j.coverUploadUrl, j.coverContentType, capa, () => {})
          .then((st) => st >= 200 && st < 300)
          .catch(() => false);
      }
      const total = faixasAlbum.length;
      let publicadas = 0;
      for (let i = 0; i < total; i++) {
        const rotulo = `Faixa ${i + 1} de ${total}…`;
        setProgresso({ rotulo, frac: 0 });
        const st = await enviarComProgresso(j.faixas[i].uploadUrl, j.faixas[i].contentType, faixasAlbum[i].arquivo, (frac) => setProgresso({ rotulo, frac }));
        if (st < 200 || st >= 300) return falha(`${erroDoBucket(st)} ${publicadas > 0 ? `(${publicadas} de ${total} faixas já publicadas)` : ""}`.trim());
        const pub = await fetch(`/api/tracks/${j.faixas[i].trackId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverOk }),
        });
        if (!pub.ok) return falha("Enviada, mas não publicada. Tente enviar de novo.");
        publicadas += 1;
      }
      setMsg({ texto: coverOk ? "Álbum publicado." : "Álbum publicado, mas sem a capa. Use uma imagem menor depois.", erro: false });
    } catch {
      falha(navigator.onLine ? "Envio interrompido. Pode ser o limite diário ou a conexão. Tente mais tarde." : "Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
      setProgresso(null);
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (emCurso.current) return;
    emCurso.current = true;
    try {
      await processar(e.currentTarget);
    } finally {
      emCurso.current = false;
    }
  }

  async function processar(form: HTMLFormElement) {
    const dados = new FormData(form);
    if (modo === "album") return enviarAlbum(dados);
    const arquivo = dados.get("arquivo") as File | null;
    if (!arquivo || arquivo.size === 0) return falha("Escolha um arquivo de áudio.");
    const tipoAudio = tipoDeAudio(arquivo.name, arquivo.type);
    if (!tipoAudio) return falha("Formato não aceito. Use MP3, M4A, AAC, OGG, FLAC, WAV ou MP4.");
    if (arquivo.size > 25 * 1024 * 1024) return falha("O áudio passa de 25 MB. Escolha um menor.");
    let capa = dados.get("capa") as File | null;
    if (capa && capa.size > 0) {
      if (capa.size > MAX_CAPA_ORIGINAL) return falha("A capa passa de 15 MB. Escolha uma menor.");
      if (!capa.type.startsWith("image/")) return falha("Capa inválida. Use uma imagem (JPG, PNG ou WebP).");
    } else capa = null;
    setEnviando(true);
    setMsg(null);
    try {
      if (capa) {
        setProgresso({ rotulo: "Preparando a capa…", frac: 0 });
        try {
          capa = await prepararCapa(capa);
        } catch {
          return falha("Não consegui ler essa capa. Tente outra imagem (JPG, PNG ou WebP).");
        }
      }
      const durationSec = await lerDuracao(arquivo);
      const r = await fetch("/api/tracks/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dados.get("titulo"),
          contentType: tipoAudio,
          size: arquivo.size,
          rightsConfirmed: dados.get("direitos") === "on",
          durationSec,
          cover: capa ? { contentType: capa.type, size: capa.size } : null,
          genre: String(dados.get("genero") ?? ""),
          mood: String(dados.get("clima") ?? ""),
          uploadKey: chaveDoEnvio(chaveEnvio, `${arquivo.name}|${arquivo.size}|${arquivo.lastModified}|${String(dados.get("titulo") ?? "")}`),
          credits: Object.fromEntries(ficha.map((f) => [f.name, String(dados.get(f.name) ?? "")])),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return falha(erroDaRotaDeUpload(r.status, j.error));
      setProgresso({ rotulo: "Enviando o áudio…", frac: 0 });
      if (j.jaPublicada) {
        chaveEnvio.current = null;
        return setMsg({ texto: "Essa faixa já está publicada.", erro: false });
      }
      const putStatus = await enviarComProgresso(j.uploadUrl, j.contentType, arquivo, (frac) => setProgresso({ rotulo: "Enviando o áudio…", frac }));
      if (putStatus < 200 || putStatus >= 300) return falha(erroDoBucket(putStatus));
      // Capa é opcional: se falhar, a faixa sai sem capa (arte gerada do título).
      let coverOk = true;
      if (capa && j.coverUploadUrl) {
        setProgresso({ rotulo: "Enviando a capa…", frac: 0 });
        coverOk = await enviarComProgresso(j.coverUploadUrl, j.coverContentType, capa, (frac) => setProgresso({ rotulo: "Enviando a capa…", frac }))
          .then((st) => st >= 200 && st < 300)
          .catch(() => false);
      }
      const pub = await fetch(`/api/tracks/${j.trackId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverOk }),
      });
      if (pub.ok) chaveEnvio.current = null;
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
      setProgresso(null);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" aria-busy={enviando}>
      <div role="radiogroup" aria-label="Tipo de envio" className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-1">
        {([["single", "Faixa avulsa"], ["album", "Álbum ou EP"]] as const).map(([v, r]) => (
          <button key={v} type="button" role="radio" aria-checked={modo === v} onClick={() => setModo(v)} className={`min-h-11 rounded-md text-sm font-semibold ${modo === v ? "bg-brand text-night-900" : "text-white/80"}`}>
            {r}
          </button>
        ))}
      </div>
      {modo === "single" ? (
        <>
          <input ref={tituloRef} name="titulo" required maxLength={200} placeholder="Título" aria-label="Título" className={campo} />
          <input
            ref={arquivoRef}
            name="arquivo"
            type="file"
            required
            accept={ACCEPT_AUDIO}
            aria-label="Arquivo de áudio (MP3, M4A, AAC, OGG, FLAC, WAV ou MP4; até 25 MB)"
            className={campo}
          />
        </>
      ) : (
        <>
          <input name="titulo-album" required maxLength={120} placeholder="Título do álbum ou EP" aria-label="Título do álbum ou EP" className={campo} />
          <select name="tipo" defaultValue="ep" aria-label="Tipo" className={campo}>
            <option value="ep">EP</option>
            <option value="album">Álbum</option>
          </select>
          <input
            type="file"
            multiple
            accept={ACCEPT_AUDIO}
            aria-label="Faixas do álbum (2 a 20 arquivos de áudio, até 25 MB cada)"
            className={campo}
            onChange={(e) => setFaixasAlbum(Array.from(e.target.files ?? []).slice(0, 20).map((arquivo) => ({ arquivo, titulo: arquivo.name.replace(/\.[^.]+$/, "") })))}
          />
          {faixasAlbum.length > 0 && (
            <ol aria-label="Faixas do álbum" className="flex flex-col gap-2">
              {faixasAlbum.map((f, i) => (
                <li key={`${f.arquivo.name}-${i}`} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-brand">{String(i + 1).padStart(2, "0")}</span>
                  <input
                    value={f.titulo}
                    maxLength={200}
                    aria-label={`Título da faixa ${i + 1}`}
                    onChange={(e) => setFaixasAlbum((l) => l.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)))}
                    className={campo}
                  />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Capa (opcional){modo === "album" ? ", única para todo o álbum" : ""}
        <input
          name="capa"
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp"
          aria-label="Capa (opcional, até 15 MB)"
          className={`${campo} text-white`}
        />
        <span>Até 15 MB; reduzimos no aparelho. Sem capa, geramos uma arte a partir do título.</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-white/70">
          Gênero
          <select name="genero" defaultValue="" className={campo}>
            <option value="">Escolher</option>
            {GENEROS.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-white/70">
          Clima
          <select name="clima" defaultValue="" className={campo}>
            <option value="">Escolher</option>
            {CLIMAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>
      {modo === "single" && (
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
      )}
      <label className="flex min-h-11 items-center gap-3 text-white/80">
        <input name="direitos" type="checkbox" required className="size-5 accent-[#e89a3c]" />
        Tenho os direitos desta faixa
      </label>
      <button type="submit" disabled={enviando} className={botao}>
        <Upload className="size-5" aria-hidden="true" /> {enviando ? "Enviando…" : "Enviar"}
      </button>
      {progresso && (
        <div role="progressbar" aria-label={progresso.rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso.frac * 100)} className="flex flex-col gap-1">
          <p className="text-sm text-white/80">{progresso.rotulo} {Math.round(progresso.frac * 100)}%</p>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-brand transition-[width]" style={{ width: `${Math.round(progresso.frac * 100)}%` }} />
          </div>
        </div>
      )}
      {msg && <Mensagem tipo={msg.erro ? "erro" : "info"}>{msg.texto}</Mensagem>}
    </form>
  );
}
