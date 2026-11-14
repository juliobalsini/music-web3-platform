"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { PainelInferior } from "@/components/ds/interativos";
import { LoginForm } from "@/components/login-form";
import { AceiteLegal } from "@/components/rodape";
import { destinoAtual, motivoPadrao } from "@/lib/auth/contextual";
import { createClient } from "@/lib/supabase/client";

type Pedido = { motivo: string; destino: string };
type Contexto = {
  /** `true` só com conta (sessão anônima ou sem sessão = `false`); `null` enquanto não se sabe. */
  conta: boolean | null;
  /** Abre o painel inferior de login; depois de entrar, volta a `destino` (padrão: a tela atual). */
  pedirLogin: (motivo?: string, destino?: string) => void;
};

const Ctx = createContext<Contexto | null>(null);

/** Painel de login contextual: ações que exigem conta abrem um painel inferior em vez de trocar de tela. */
export function LoginContextualProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [conta, setConta] = useState<boolean | null>(null);

  // Lê a sessão do cookie local (sem ida à rede). Sem Supabase (testes/prévias): visitante.
  useEffect(() => {
    let vivo = true;
    let cancelar = () => {};
    try {
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data }) => vivo && setConta(!!data.session?.user && !data.session.user.is_anonymous));
      const { data } = supabase.auth.onAuthStateChange((_, s) => vivo && setConta(!!s?.user && !s.user.is_anonymous));
      cancelar = () => data.subscription.unsubscribe();
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sem Supabase configurado, decide uma vez
      setConta(false);
    }
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  const pedirLogin = useCallback((motivo?: string, destino?: string) => {
    setPedido({ motivo: motivo ?? motivoPadrao(), destino: destino ?? destinoAtual(window.location) });
  }, []);
  const fechar = useCallback(() => setPedido(null), []);
  const valor = useMemo(() => ({ conta, pedirLogin }), [conta, pedirLogin]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <Suspense>
        <FecharAoNavegar aoMudar={fechar} />
      </Suspense>
      {/* Marca para os testes E2E: a sessão já foi lida (antes disso os links navegam normalmente). */}
      {conta !== null && <span hidden data-testid="sessao-lida" data-conta={conta ? "1" : "0"} />}
      <PainelInferior aberto={!!pedido} aoFechar={fechar} titulo="Entre para continuar">
        {pedido && (
          <div data-testid="login-contextual" className="flex flex-col gap-4">
            <p className="text-pretty text-[var(--ds-texto-2)]">{pedido.motivo}</p>
            <LoginForm key={pedido.destino} next={pedido.destino} />
            <AceiteLegal />
          </div>
        )}
      </PainelInferior>
    </Ctx.Provider>
  );
}

/** Ao trocar de tela (ex.: tocar em Termos) o pedido perde o sentido. Fica em Suspense por causa do `usePathname`. */
function FecharAoNavegar({ aoMudar }: { aoMudar: () => void }) {
  const caminho = usePathname();
  const anterior = useRef(caminho);
  useEffect(() => {
    if (anterior.current === caminho) return;
    anterior.current = caminho;
    aoMudar();
  }, [caminho, aoMudar]);
  return null;
}

/** Acesso ao painel. Fora do provider, cai na tela de login (mesmo destino). */
export function useLoginContextual(): Contexto {
  const ctx = useContext(Ctx);
  const router = useRouter();
  return (
    ctx ?? {
      conta: null,
      pedirLogin: (_m, destino) => router.push(`/login?next=${encodeURIComponent(destino ?? destinoAtual(window.location))}`),
    }
  );
}

/** Botão "Entrar" curto (avisos de "só contas"): abre o painel em vez de navegar. */
export function BotaoEntrar({ motivo, destino, className = "font-semibold underline underline-offset-2" }: { motivo?: string; destino?: string; className?: string }) {
  const { pedirLogin } = useLoginContextual();
  return (
    <button type="button" onClick={() => pedirLogin(motivo, destino)} className={className}>
      Entrar
    </button>
  );
}

/**
 * Link para uma tela que exige conta (criar playlist, story, enviar música). Visitante: abre o painel de login
 * e, depois de entrar, segue para `href`. Com conta (ou enquanto não se sabe), navega normalmente — o servidor
 * continua decidindo o acesso.
 */
export function LinkConta({ href, motivo, onClick, ...resto }: ComponentProps<typeof Link> & { href: string; motivo: string }) {
  const { conta, pedirLogin } = useLoginContextual();
  return (
    <Link
      href={href}
      {...resto}
      onClick={(e) => {
        onClick?.(e);
        if (conta === false && !e.defaultPrevented) {
          e.preventDefault();
          pedirLogin(motivo, href);
        }
      }}
    />
  );
}
