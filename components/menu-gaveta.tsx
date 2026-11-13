"use client";
/* eslint-disable @next/next/no-img-element -- avatar externo (Google), sem otimizador (cota). */

import { Cog, FileText, FolderOpen, LogIn, LogOut, Menu, ShieldCheck, Star, Upload, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { entrarComGoogle, sair } from "@/app/login/actions";
import { botao } from "@/components/ui";
import type { ResumoConta } from "@/lib/session";

const item = "foco-claro flex min-h-12 items-center gap-3 rounded-lg px-3 text-base font-semibold hover:bg-white/10";

/** Menu ☰ e gaveta lateral (desliza da direita; fecha com toque fora, deslize para a direita, Esc ou ao navegar). */
export function MenuGaveta({ conta }: { conta: ResumoConta }) {
  const [aberta, setAberta] = useState(false);
  const caminho = usePathname();
  const inicioX = useRef<number | null>(null);
  const [anterior, setAnterior] = useState(caminho);
  if (anterior !== caminho) {
    setAnterior(caminho);
    setAberta(false);
  }

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={aberta}
        data-testid="menu-abrir"
        className="foco-claro flex size-11 items-center justify-center rounded-full hover:bg-white/10"
      >
        <Menu className="size-7" aria-hidden="true" />
      </button>

      <div className={`fixed inset-0 z-50 ${aberta ? "" : "pointer-events-none"}`} aria-hidden={!aberta}>
        <button
          type="button"
          tabIndex={aberta ? 0 : -1}
          aria-label="Fechar menu"
          onClick={() => setAberta(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${aberta ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-testid="gaveta"
          inert={!aberta}
          onTouchStart={(e) => (inicioX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (inicioX.current !== null && e.changedTouches[0].clientX - inicioX.current > 70) setAberta(false);
            inicioX.current = null;
          }}
          className={`absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col gap-4 overflow-y-auto bg-night-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 ease-out ${aberta ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex justify-end">
            <button type="button" onClick={() => setAberta(false)} aria-label="Fechar" className="foco-claro flex size-11 items-center justify-center rounded-full hover:bg-white/10">
              <X className="size-6" aria-hidden="true" />
            </button>
          </div>

          {conta.logado ? (
            <>
              <div className="flex items-center gap-3 px-1">
                {conta.foto ? (
                  <img src={conta.foto} alt="" width={56} height={56} referrerPolicy="no-referrer" className="size-14 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xl font-bold text-night-900">
                    {(conta.nome ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold">{conta.nome ?? "Sua conta"}</p>
                  <Link href="/minha-radio" className="foco-claro text-sm font-semibold text-brand underline underline-offset-2">Ver perfil</Link>
                </div>
              </div>
              <nav aria-label="Conta" className="flex flex-col">
                <Link href="/minha-radio" className={item}><Star className="size-5 text-brand" aria-hidden="true" />Seus pontos</Link>
                <Link href="/meus-envios" className={item}><FolderOpen className="size-5 text-brand" aria-hidden="true" />Meus envios</Link>
                <Link href="/enviar" className={item}><Upload className="size-5 text-brand" aria-hidden="true" />Enviar música</Link>
                <Link href="/ajustes" className={item}><Cog className="size-5 text-brand" aria-hidden="true" />Configurações</Link>
              </nav>
            </>
          ) : (
            <section aria-label="Crie sua conta" className="flex flex-col gap-3 rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-2">
                <UserRound className="size-6 text-brand" aria-hidden="true" />
                <h2 className="text-lg font-bold">Crie sua conta</h2>
              </div>
              <p className="text-sm text-white/80 text-pretty">Salve seus pontos, crie playlists e envie música.</p>
              <form action={entrarComGoogle} className="flex flex-col gap-2">
                <input type="hidden" name="next" value={caminho} />
                <button className={`${botao} !bg-none !bg-white !text-night-900`}>
                  <LogIn className="size-5" aria-hidden="true" /> Continuar com Google
                </button>
              </form>
              <Link href={`/login?next=${encodeURIComponent(caminho)}`} className="foco-claro flex min-h-11 items-center justify-center text-sm font-semibold text-brand underline underline-offset-2">
                Entrar com link por e-mail
              </Link>
            </section>
          )}

          <nav aria-label="Legal" className="mt-auto flex flex-col border-t border-white/10 pt-2">
            <Link href="/privacidade" className={item}><ShieldCheck className="size-5 text-white/70" aria-hidden="true" />Privacidade</Link>
            <Link href="/termos" className={item}><FileText className="size-5 text-white/70" aria-hidden="true" />Termos</Link>
            {conta.logado && (
              <form action={sair}>
                <button className={`${item} w-full`}><LogOut className="size-5 text-white/70" aria-hidden="true" />Sair</button>
              </form>
            )}
          </nav>
        </aside>
      </div>
    </>
  );
}
