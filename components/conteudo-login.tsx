import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { AceiteLegal } from "@/components/rodape";

export const SUBTITULO_LOGIN = "Música independente do mundo todo. Ouça, siga artistas e envie suas faixas.";

/**
 * Conteúdo único do login (issue #120): logo, convite, Google oficial, "ou", e-mail → código, aceite.
 * Usado no painel inferior (login contextual) e nas rotas diretas `/entrar` e `/login`.
 */
export function ConteudoLogin({ next, motivo, logo = true }: { next: string; motivo?: string; logo?: boolean }) {
  return (
    <div data-testid="conteudo-login" className="flex flex-col gap-4">
      {/* Na página inteira o cabeçalho já mostra o logo. */}
      {logo && <Logo className="mx-auto h-12 w-auto" />}
      <div className="flex flex-col gap-1 text-center">
        <p className="text-pretty text-[var(--ds-texto-2)]">{SUBTITULO_LOGIN}</p>
        {motivo && <p className="text-pretty text-sm font-semibold text-brand">{motivo}</p>}
      </div>
      <LoginForm next={next} />
      <AceiteLegal />
    </div>
  );
}
