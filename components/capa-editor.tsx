"use client";

import { Camera, ImagePlus, LayoutGrid, Palette } from "lucide-react";
import { useRef, useState } from "react";

import { definirCapa } from "@/app/playlist/actions";
import { PainelInferior } from "@/components/ds/interativos";
import { EstudioCapa } from "@/components/estudio-capa";
import { abrirFoto, enviarImagem, RecorteFoto, type Foto } from "@/components/recorte-foto";
import { Mensagem } from "@/components/ui";
import { urlCapaPlaylist } from "@/lib/playlists/capa";

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
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

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

  const escolher = async (f: File | undefined) => {
    setErro(null);
    if (!f) return;
    const r = await abrirFoto(f);
    if (typeof r === "string") return setErro(r);
    trocarFoto(r);
  };

  const salvar = async (key: string | null) => {
    const r = await definirCapa(id, key);
    if (!r.ok) return setErro(r.erro);
    aoMudar(urlCapaPlaylist(id, key));
    setAberto(false);
    setEstudio(false);
    trocarFoto(null);
  };

  /** Envia a imagem direto ao bucket (covers/) e grava a capa. */
  const enviar = async (img: Blob) => {
    setEnviando(true);
    setErro(null);
    try {
      const r = await enviarImagem(`/api/playlists/${id}/capa`, img);
      if ("erro" in r) return setErro(r.erro);
      await salvar(r.key);
    } finally {
      setEnviando(false);
    }
  };

  const usar = async (jpeg: Blob | null) => {
    if (!jpeg) return setErro("Não deu para preparar a imagem. Tente outra.");
    await enviar(jpeg);
  };

  const voltarAoMosaico = async () => {
    setEnviando(true);
    setErro(null);
    try { await salvar(null); } finally { setEnviando(false); }
  };

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
        <span className="absolute -bottom-1.5 -right-1.5 grid size-9 place-items-center rounded-full bg-brand text-sobre-destaque shadow-[0_2px_8px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-out group-active:scale-90" aria-hidden="true">
          <Camera className="size-4" />
        </span>
      </button>

      <PainelInferior aberto={aberto} aoFechar={fechar} titulo="Capa da playlist">
        <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />

        {estudio ? (
          <EstudioCapa titulo={titulo} enviando={enviando} erro={erro} aoUsar={enviar} aoVoltar={() => { setEstudio(false); setErro(null); }} />
        ) : foto ? (
          <RecorteFoto
            foto={foto}
            rotulo="Enquadramento da capa"
            usar="Usar esta capa"
            enviando={enviando}
            erro={erro}
            aoUsar={usar}
            aoTrocar={() => arquivo.current?.click()}
          />
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
