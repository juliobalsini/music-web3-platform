"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { apagar, desfazer, renomear } from "@/app/meus-envios/actions";
import { MenuMais, PainelInferior, type ItemMenu } from "@/components/ds/interativos";
import { campo } from "@/components/ui";
import { marcarCompartilhou } from "@/lib/artista/trilha-cliente";
import { DIAS_DESFAZER, MAX_TITULO, ROTULO_TIPO, type TipoEnvio } from "@/lib/envios/rules";

const APAGADO: Record<TipoEnvio, string> = { faixa: "Faixa apagada.", album: "Álbum apagado.", playlist: "Playlist apagada.", story: "Story apagado." };
const botao = "min-h-11 flex-1 rounded-full px-4 text-sm font-bold disabled:opacity-60";

/**
 * Menu ⋯ de um item próprio (faixa, álbum, playlist, story): Editar e Apagar com confirmação.
 * Apagar é lógico e reversível por 30 dias. `depois`: para onde ir ao apagar estando na página do item
 * (lá o aviso com Desfazer aparece); sem ele, a lista se atualiza e o aviso aparece aqui mesmo.
 */
export function MenuEnvio({ tipo, id, titulo, depois, compartilhavel = false }: { tipo: TipoEnvio; id: string; titulo: string; depois?: string; compartilhavel?: boolean }) {
  const router = useRouter();
  const [painel, setPainel] = useState<"apagar" | "editar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [apagado, setApagado] = useState(false);
  const [nome, setNome] = useState(titulo);
  const [pendente, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  const itens: ItemMenu[] = [];
  if (tipo === "playlist") itens.push({ rotulo: "Editar", aoEscolher: () => router.push(`/playlist/${id}?editar=1`) });
  if (tipo === "faixa" || tipo === "album") itens.push({ rotulo: "Editar título", aoEscolher: () => (setErro(null), setPainel("editar")) });
  if (compartilhavel) itens.push({ rotulo: "Compartilhar", aoEscolher: () => void compartilhar() });
  itens.push({ rotulo: "Apagar", perigo: true, aoEscolher: () => (setErro(null), setPainel("apagar")) });

  /** Compartilhar: menu nativo do celular; sem ele, copia o link. */
  async function compartilhar() {
    const url = `${window.location.origin}/${tipo}/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        if (tipo === "faixa") marcarCompartilhou();
      } catch {
        /* cancelado */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      if (tipo === "faixa") marcarCompartilhou();
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* sem permissão: nada a fazer */
    }
  }

  function confirmarApagar() {
    iniciar(async () => {
      const r = await apagar(tipo, id);
      if (!r.ok) return setErro(r.erro);
      setPainel(null);
      if (depois) router.push(`${depois}?apagado=${tipo}.${id}`);
      else {
        setApagado(true);
        router.refresh();
      }
    });
  }
  function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await renomear(tipo, id, nome);
      if (!r.ok) return setErro(r.erro);
      setPainel(null);
      router.refresh();
    });
  }

  return (
    <>
      <MenuMais itens={itens} rotulo={`Mais ações: ${titulo}`} />
      <p role="status" className={copiado ? "fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-full border border-[var(--ds-borda)] bg-[var(--ds-bg)] px-4 py-3 text-center text-sm font-semibold text-[var(--ds-texto)] shadow-lg" : "sr-only"}>
        {copiado ? "Link copiado." : ""}
      </p>
      {apagado && <AvisoApagado tipo={tipo} id={id} aoDesfazer={() => setApagado(false)} />}
      <PainelInferior aberto={painel === "apagar"} aoFechar={() => setPainel(null)} titulo={`Apagar ${ROTULO_TIPO[tipo].toLowerCase()}?`}>
        <p className="text-pretty">
          <strong className="font-semibold">{titulo}</strong> some na hora para todos. Você pode desfazer em Meus envios por {DIAS_DESFAZER} dias.
        </p>
        {erro && <p role="alert" className="text-sm text-[var(--ds-erro)]">{erro}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setPainel(null)} className={`${botao} bg-[var(--ds-surface)]`}>Cancelar</button>
          <button type="button" onClick={confirmarApagar} disabled={pendente} className={`${botao} bg-[var(--ds-erro)] text-[var(--ds-bg)]`}>
            {pendente ? "Apagando…" : "Apagar"}
          </button>
        </div>
      </PainelInferior>
      {(tipo === "faixa" || tipo === "album") && (
        <PainelInferior aberto={painel === "editar"} aoFechar={() => setPainel(null)} titulo="Editar título">
          <form onSubmit={salvarNome} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Título
              <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={MAX_TITULO[tipo]} required className={campo} />
            </label>
            {erro && <p role="alert" className="text-sm text-[var(--ds-erro)]">{erro}</p>}
            <button type="submit" disabled={pendente} className={`${botao} bg-[var(--ds-destaque)] text-[var(--ds-sobre-destaque)]`}>
              {pendente ? "Salvando…" : "Salvar"}
            </button>
          </form>
        </PainelInferior>
      )}
    </>
  );
}

/** Aviso fixo acima da barra inferior: "Apagado" + Desfazer. */
export function AvisoApagado({ tipo, id, aoDesfazer }: { tipo: TipoEnvio; id: string; aoDesfazer?: () => void }) {
  const [visivel, setVisivel] = useState(true);
  if (!visivel) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-36 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[var(--ds-raio)] bg-[var(--ds-surface-2)] px-4 py-2 shadow-lg">
      <span className="text-sm">{APAGADO[tipo]}</span>
      <BotaoDesfazer tipo={tipo} id={id} aoDesfazer={() => (setVisivel(false), aoDesfazer?.())} />
    </div>
  );
}

/** Desfazer um "Apagar" (lixeira de Meus envios e aviso). */
export function BotaoDesfazer({ tipo, id, aoDesfazer }: { tipo: TipoEnvio; id: string; aoDesfazer?: () => void }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <span className="flex shrink-0 items-center gap-2">
      {erro && <span role="alert" className="text-xs text-[var(--ds-erro)]">{erro}</span>}
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await desfazer(tipo, id);
            if (!r.ok) return setErro(r.erro);
            aoDesfazer?.();
            router.refresh();
          })
        }
        className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[var(--ds-destaque)] disabled:opacity-60"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {pendente ? "Desfazendo…" : "Desfazer"}
      </button>
    </span>
  );
}
