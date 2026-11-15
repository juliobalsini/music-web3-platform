"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { entrarComGoogleToken } from "@/app/login/actions";
import { Mensagem } from "@/components/ui";
import {
  COOKIE_TESTE_GIS,
  gerarNonce,
  GIS_SCRIPT,
  GIS_TEMPO_LIMITE_MS,
  googleClientId,
  hashNonce,
  loginGisLigado,
  ONE_TAP_ATRASO_MS,
  ONE_TAP_CHAVE,
  origemGoogleAutorizada,
  podeMostrarOneTap,
} from "@/lib/auth/google";

type Credencial = { credential?: string };
type Gis = {
  accounts: {
    id: {
      initialize: (c: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
      prompt: () => void;
      cancel: () => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gis;
  }
}

let carregando: Promise<Gis | null> | null = null;

/** Carrega o script do Google uma vez; `null` se falhar ou demorar (aí aparece o botão antigo). */
export function carregarGis(): Promise<Gis | null> {
  if (typeof window === "undefined" || !loginGisLigado()) return Promise.resolve(null);
  const teste = document.cookie.split("; ").includes(`${COOKIE_TESTE_GIS}=1`);
  if (!teste && !origemGoogleAutorizada(location.origin)) return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  carregando ??= new Promise<Gis | null>((resolver) => {
    const s = document.createElement("script");
    s.src = GIS_SCRIPT;
    s.async = true;
    const fim = (ok: boolean) => {
      clearTimeout(t);
      resolver(ok && window.google?.accounts?.id ? window.google : null);
    };
    const t = setTimeout(() => fim(false), GIS_TEMPO_LIMITE_MS);
    s.onload = () => fim(true);
    s.onerror = () => fim(false);
    document.head.appendChild(s);
  }).then((g) => {
    if (!g) carregando = null; // permite tentar de novo noutra tela
    return g;
  });
  return carregando;
}

/** Prepara o GIS com um nonce novo; `aoEntrar` recebe o token de ID e o nonce cru. */
async function iniciar(g: Gis, aoEntrar: (token: string, nonce: string) => void, extra: Record<string, unknown> = {}) {
  const nonce = gerarNonce();
  g.accounts.id.initialize({
    client_id: googleClientId(),
    nonce: await hashNonce(nonce),
    callback: (r: Credencial) => r.credential && aoEntrar(r.credential, nonce),
    use_fedcm_for_prompt: true,
    ...extra,
  });
}

/** Troca o token por sessão e recarrega a tela de origem (todos os componentes leem a sessão nova). */
async function concluir(token: string, nonce: string, next: string): Promise<string | undefined> {
  const r = await entrarComGoogleToken(token, nonce, next);
  if (r.entrou) {
    window.location.assign(r.entrou);
    return undefined;
  }
  return r.erro;
}

/**
 * Botão oficial "Fazer login com o Google". Enquanto o script carrega, reserva o espaço; se não carregar
 * (bloqueado, offline, flag desligada), mostra `reserva` (o login por redirecionamento de antes).
 */
export function BotaoGoogle({ next, reserva }: { next: string; reserva: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "reserva">("carregando");
  const [erro, setErro] = useState<string>();
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let vivo = true;
    void carregarGis().then(async (g) => {
      if (!vivo) return;
      if (!g || !caixa.current) return setEstado("reserva");
      try {
        await iniciar(g, async (token, nonce) => {
          setEntrando(true);
          setErro(undefined);
          const e = await concluir(token, nonce, next);
          if (e) {
            setErro(e);
            setEntrando(false);
          }
        });
        const largura = Math.min(400, Math.max(200, Math.round(caixa.current.getBoundingClientRect().width) || 320));
        g.accounts.id.renderButton(caixa.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          logo_alignment: "center",
          locale: "pt-BR",
          width: largura,
        });
        if (vivo) setEstado("pronto");
      } catch {
        if (vivo) setEstado("reserva");
      }
    });
    return () => {
      vivo = false;
    };
  }, [next]);

  if (estado === "reserva") return <>{reserva}</>;
  return (
    <div className="flex flex-col gap-2">
      <div
        ref={caixa}
        data-testid="google-oficial"
        data-estado={estado}
        aria-busy={estado === "carregando" || entrando}
        className="flex min-h-11 w-full items-center justify-center [color-scheme:light]"
      />
      {entrando && <p role="status" className="text-center text-sm text-white/70">Entrando…</p>}
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {/* Se o token for recusado, o caminho antigo (redirecionamento) fica à mão. */}
      {erro && reserva}
    </div>
  );
}

/**
 * One Tap: só visitante sem conta, no máx. uma vez por sessão, nunca com player em tela cheia, stories, painel
 * ou menu abertos; se um deles abrir com o One Tap na tela, ele é cancelado.
 */
export function OneTapGoogle({ conta }: { conta: boolean | null }) {
  const caminho = usePathname();
  useEffect(() => {
    if (conta !== false) return;
    let vivo = true;
    let observador: MutationObserver | null = null;
    // <dialog> aberto (player em tela cheia, stories, painéis) ou camada modal ativa (gaveta, menu Criar).
    const dialogAberto = () => !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not([inert])');
    const jaMostrado = () => {
      try {
        return sessionStorage.getItem(ONE_TAP_CHAVE) === "1";
      } catch {
        return true;
      }
    };
    const pode = () => podeMostrarOneTap({ conta, jaMostrado: jaMostrado(), dialogAberto: dialogAberto(), caminho: window.location.pathname });
    if (!pode()) return;
    const t = setTimeout(async () => {
      if (!vivo || !pode()) return;
      const g = await carregarGis();
      if (!g || !vivo || !pode()) return;
      try {
        await iniciar(g, (token, nonce) => void concluir(token, nonce, `${location.pathname}${location.search}`), {
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          context: "signin",
        });
        if (!vivo || !pode()) return;
        sessionStorage.setItem(ONE_TAP_CHAVE, "1");
        g.accounts.id.prompt();
        observador = new MutationObserver(() => dialogAberto() && g.accounts.id.cancel());
        observador.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open", "inert"], childList: true });
      } catch {
        /* sem One Tap; o botão segue no painel */
      }
    }, ONE_TAP_ATRASO_MS);
    return () => {
      vivo = false;
      clearTimeout(t);
      observador?.disconnect();
    };
  }, [conta, caminho]);
  return null;
}
