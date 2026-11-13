"use client";

import { Bookmark, BookmarkCheck, MoreHorizontal, Pencil, Play, Share2, Shuffle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { alternarSalvar, apagarPlaylist } from "@/app/playlist/actions";
import { usePlayer } from "@/components/player-provider";
import { PainelCompartilharAlvo } from "@/components/story-paineis";
import type { FaixaListada } from "@/lib/radio/rules";

const btn = "flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold";

/** Tocar tudo, Aleatório, Salvar, Compartilhar e menu ⋯ do dono (Editar/Apagar). */
export function AcoesPlaylist({
  id, titulo, autor, faixas, saves, salva, logado, dono, abrirCompartilhar,
}: {
  id: string; titulo: string; autor: string | null; faixas: FaixaListada[]; saves: number; salva: boolean; logado: boolean; dono: boolean; abrirCompartilhar: boolean;
}) {
  const { tocar } = usePlayer();
  const [salvaAgora, setSalva] = useState(salva);
  const [total, setTotal] = useState(saves);
  const [compartilhar, setCompartilhar] = useState(abrirCompartilhar);
  const [menu, setMenu] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function aleatorio() {
    const f = [...faixas];
    for (let i = f.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [f[i], f[j]] = [f[j], f[i]];
    }
    if (f[0]) tocar(f[0], f);
  }
  function salvar() {
    if (!logado) return setAviso("Entre na sua conta para salvar playlists.");
    iniciar(async () => {
      const r = await alternarSalvar(id);
      if (!r.ok) return setAviso(r.erro);
      setSalva(!!r.salva);
      setTotal((n) => Math.max(0, n + (r.salva ? 1 : -1)));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={faixas.length === 0} onClick={() => tocar(faixas[0], faixas)} className={`${btn} bg-gradient-to-br from-brand to-brand-2 text-night-900 disabled:opacity-50`}>
          <Play className="size-4" aria-hidden="true" /> Tocar tudo
        </button>
        <button type="button" disabled={faixas.length === 0} onClick={aleatorio} className={`${btn} bg-white/10 hover:bg-white/15 disabled:opacity-50`}>
          <Shuffle className="size-4" aria-hidden="true" /> Aleatório
        </button>
        {!dono && (
          <button type="button" onClick={salvar} disabled={pendente} aria-pressed={salvaAgora} className={`${btn} bg-white/10 hover:bg-white/15`}>
            {salvaAgora ? <BookmarkCheck className="size-4 text-brand" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
            {salvaAgora ? "Salva" : "Salvar"}
          </button>
        )}
        <button type="button" onClick={() => setCompartilhar(true)} aria-label="Compartilhar" className={`${btn} bg-white/10 hover:bg-white/15`}>
          <Share2 className="size-4" aria-hidden="true" />
        </button>
        {dono && (
          <div className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} aria-label="Mais opções" aria-expanded={menu} className={`${btn} bg-white/10 hover:bg-white/15`}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 z-20 mt-1 flex w-44 flex-col rounded-xl bg-night-800 p-1 shadow-lg ring-1 ring-white/10">
                <Link role="menuitem" href={`/playlist/${id}?editar=1`} className="flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-white/10"><Pencil className="size-4" aria-hidden="true" /> Editar</Link>
                <form action={apagarPlaylist.bind(null, id)} onSubmit={(e) => { if (!confirm("Apagar esta playlist? Não dá para desfazer.")) e.preventDefault(); }}>
                  <button role="menuitem" className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left hover:bg-white/10"><Trash2 className="size-4" aria-hidden="true" /> Apagar</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-white/70">
        {total} {total === 1 ? "salvamento" : "salvamentos"}
      </p>
      {aviso && <p role="status" className="text-sm text-brand-2">{aviso}</p>}
      {compartilhar && (
        <div className="fixed inset-0 z-50">
          <PainelCompartilharAlvo
            caminho={`/playlist/${id}`}
            texto={`${titulo}${autor ? ` · ${autor}` : ""} na radioOn`}
            cartaoUrl={`/api/playlists/${id}/cartao`}
            arquivo={`playlist-radioon-${id}.png`}
            onFechar={() => setCompartilhar(false)}
          />
        </div>
      )}
    </div>
  );
}
