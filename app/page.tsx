import Link from "next/link";
import { Suspense } from "react";

import { Busca } from "@/components/busca";
import { CartaoNoAr } from "@/components/cartao-no-ar";
import { ContinueOuvindo } from "@/components/continue-ouvindo";
import { ListaFaixas } from "@/components/lista-faixas";
import { EstadoVazio, PlayVazio, PlaylistersEmAlta, PlaylistsDaSemana } from "@/components/secoes-radio";
import { ABAS, FILTROS, lerAba, lerFiltro, type Aba } from "@/lib/menu";
import { carregarRadio, continuarOuvindo } from "@/lib/radio/queries";
import { getSessionRole } from "@/lib/session";

const chip = "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold";

async function Conteudo({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const filtro = lerFiltro(sp.f);
  const radio = await carregarRadio();
  const mostra = (...f: string[]) => filtro === "tudo" || f.includes(filtro);

  let continuar = { titulo: "Para começar", faixas: radio.novidades.slice(0, 4) };
  try {
    const sessao = await getSessionRole();
    if (sessao) {
      const meus = await continuarOuvindo(sessao.userId, radio.faixas);
      if (meus.length > 0) continuar = { titulo: "Continue ouvindo", faixas: meus };
    }
  } catch {
    /* deslogado */
  }

  const vazias: Record<Aba, boolean> = {
    descobertas: radio.descobertas.length === 0,
    alta: radio.emAlta.length === 0,
    novidades: radio.novidades.length === 0,
  };
  const aba: Aba = lerAba(sp.aba) ?? ABAS.find((a) => !vazias[a.id])?.id ?? "novidades";
  const href = (params: Record<string, string>) => {
    const q = new URLSearchParams(params);
    return `/?${q.toString()}`;
  };

  return (
    <>
      <Busca />
      <nav aria-label="Filtros" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "tudo" ? "/" : href({ f: f.id })}
            aria-current={filtro === f.id ? "page" : undefined}
            className={`${chip} shrink-0 ${filtro === f.id ? "bg-brand text-night-900" : "bg-white/10 text-white hover:bg-white/15"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {radio.faixas.length === 0 && mostra("faixas") ? (
        <EstadoVazio />
      ) : (
        mostra("faixas") && radio.noAr && (
          <>
            <CartaoNoAr
              faixa={radio.noAr.faixa}
              fila={radio.noAr.fila}
              atual={radio.programa.atual}
              proximo={radio.programa.proximo}
              ouvindo={radio.ouvindo}
            />
            <ContinueOuvindo titulo={continuar.titulo} faixas={continuar.faixas} />
            <section aria-label="Faixas" className="flex flex-col gap-1">
              <nav aria-label="Listas" className="mb-1 flex gap-1 border-b border-white/10">
                {ABAS.map((a) => (
                  <Link
                    key={a.id}
                    href={href({ ...(filtro === "tudo" ? {} : { f: filtro }), aba: a.id })}
                    aria-current={aba === a.id ? "page" : undefined}
                    className={`flex min-h-11 items-center px-3 text-sm font-semibold ${aba === a.id ? "border-b-2 border-brand text-brand" : "text-white/70 hover:text-white"}`}
                  >
                    {a.label}
                  </Link>
                ))}
              </nav>
              {aba === "descobertas" && (
                <ListaFaixas rotulo="Descobertas" faixas={radio.descobertas} numerar dica="Pouco ouvidas, escolhidas a dedo por playlisters" vazio="Quando playlisters escolherem faixas pouco ouvidas, elas aparecem aqui." />
              )}
              {aba === "alta" && <ListaFaixas rotulo="Em alta" dica="As mais ouvidas da semana na rádio" ranking={radio.emAlta} vazio="O ranking aparece com as primeiras escutas da semana." />}
              {aba === "novidades" && <ListaFaixas rotulo="Novidades" numerar dica="Acabaram de chegar de artistas independentes" faixas={radio.novidades} />}
            </section>
          </>
        )
      )}

      {mostra("playlisters") && <PlaylistersEmAlta lista={radio.playlisters} />}
      {mostra("playlists") && <PlaylistsDaSemana lista={radio.playlists} />}
      {filtro === "playlisters" && radio.playlisters.length === 0 && <p className="text-white/70">Nenhum playlister em alta ainda.</p>}
      {filtro === "playlists" && radio.playlists.length === 0 && <p className="text-white/70">Nenhuma playlist pública ainda.</p>}
    </>
  );
}

export default function Radio({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-2">
      <h1 className="sr-only">radioOn · Rádio</h1>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <PlayVazio />
          </div>
        }
      >
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
