"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { PainelInferior } from "@/components/ds/interativos";
import { OneTapGoogle } from "@/components/google-gis";
import { ACAO_PENDENTE_CHAVE, acaoDaTela, lerAcao, serializarAcao } from "@/lib/auth/acao-pendente";
import { destinoAtual, motivoPadrao } from "@/lib/auth/contextual";

// O formulário de login só aparece quando alguém pede para entrar: fica fora do JS inicial (revisão pré-beta, fatia 2).
// Import manual em vez de `next/dynamic`: sem Suspense, a troca não depende de timers (relógio congelado nos E2E).
type Conteudo = typeof import("@/components/conteudo-login").ConteudoLogin;
const carregarConteudo = () => import("@/components/conteudo-login").then((m) => m.ConteudoLogin);

type Pedido = { motivo: string; destino: string };
type Contexto = {
  /** `true` só com conta (sessão anônima ou sem sessão = `false`); `null` enquanto não se sabe. */
  conta: boolean | null;
  /**
   * Abre o painel inferior de login; depois de entrar, volta a `destino` (padrão: a tela atual) e, se houver
   * `acao` (ex.: `seguir:<id>`), o componente que a registrou com `useAcaoPendente` a conclui sozinho.
   */
  pedirLogin: (motivo?: string, destino?: string, acao?: string) => void;
};

const Ctx = createContext<Contexto | null>(null);

/** Painel de login contextual: ações que exigem conta abrem um painel inferior em vez de trocar de tela. */
export function LoginContextualProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [conta, setConta] = useState<boolean | null>(null);
  const [ConteudoLogin, setConteudoLogin] = useState<Conteudo | null>(null);

  // Lê a sessão do cookie local (sem ida à rede). Sem Supabase (testes/prévias): visitante.
  // O cliente do Supabase (~65 KB gzip) vem por import dinâmico, fora do JS inicial (revisão pré-beta, fatia 2).
  useEffect(() => {
    let vivo = true;
    let cancelar = () => {};
    import("@/lib/supabase/client")
      .then(({ createClient }) => {
        if (!vivo) return;
        const supabase = createClient();
        void supabase.auth.getSession().then(({ data }) => vivo && setConta(!!data.session?.user && !data.session.user.is_anonymous));
        const { data } = supabase.auth.onAuthStateChange((_, s) => vivo && setConta(!!s?.user && !s.user.is_anonymous));
        cancelar = () => data.subscription.unsubscribe();
      })
      // Sem Supabase configurado (ou sem rede para o chunk), decide uma vez: visitante.
      .catch(() => vivo && setConta(false));
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  const pedirLogin = useCallback((motivo?: string, destino?: string, acao?: string) => {
    const alvo = destino ?? destinoAtual(window.location);
    guardarAcao(acao ? serializarAcao(acao, alvo, Date.now()) : null);
    setPedido({ motivo: motivo ?? motivoPadrao(), destino: alvo });
    void carregarConteudo().then((c) => setConteudoLogin(() => c));
  }, []);
  // Fechar sem entrar desiste da ação (entrar recarrega a página antes de qualquer fechamento).
  const fechar = useCallback(() => {
    setPedido((p) => {
      if (p) guardarAcao(null);
      return null;
    });
  }, []);
  const valor = useMemo(() => ({ conta, pedirLogin }), [conta, pedirLogin]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <Suspense>
        <FecharAoNavegar aoMudar={fechar} />
      </Suspense>
      {/* Marca para os testes E2E: a sessão já foi lida (antes disso os links navegam normalmente). */}
      {conta !== null && <span hidden data-testid="sessao-lida" data-conta={conta ? "1" : "0"} />}
      <Suspense>
        <OneTapGoogle conta={conta} />
      </Suspense>
      <PainelInferior aberto={!!pedido} aoFechar={fechar} titulo="Entre na radioOn">
        {pedido && (
          <div data-testid="login-contextual">
            {ConteudoLogin ? (
              <ConteudoLogin key={pedido.destino} next={pedido.destino} motivo={pedido.motivo} />
            ) : (
              <div role="status" aria-busy="true" className="min-h-72">
                <span className="sr-only">Carregando…</span>
              </div>
            )}
          </div>
        )}
      </PainelInferior>
    </Ctx.Provider>
  );
}

function guardarAcao(valor: string | null) {
  try {
    if (valor) localStorage.setItem(ACAO_PENDENTE_CHAVE, valor);
    else localStorage.removeItem(ACAO_PENDENTE_CHAVE);
  } catch {
    /* sem armazenamento: só não conclui sozinho */
  }
}

/**
 * Conclui a ação pedida antes do login (ex.: `seguir:<id>`) quando a pessoa volta com conta à mesma tela.
 * Executa uma vez e apaga o lembrete; o servidor continua decidindo (é a mesma ação do toque).
 */
export function useAcaoPendente(acao: string, executar: () => void) {
  const { conta } = useLoginContextual();
  const fn = useRef(executar);
  useEffect(() => {
    fn.current = executar;
  });
  useEffect(() => {
    if (conta !== true) return;
    let p = null;
    try {
      p = lerAcao(localStorage.getItem(ACAO_PENDENTE_CHAVE), Date.now());
    } catch {
      return;
    }
    // Caminho lido do navegador (sem usePathname: o hook exigiria Suspense em volta de cada botão).
    if (!p || !acaoDaTela(p, acao, window.location.pathname)) return;
    guardarAcao(null);
    fn.current();
  }, [conta, acao]);
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
      pedirLogin: (_m, destino) => router.push(`/entrar?next=${encodeURIComponent(destino ?? destinoAtual(window.location))}`),
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
