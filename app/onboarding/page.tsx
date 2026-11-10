import { Headphones, ListMusic, Mic2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Mensagem, Tela, campo } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

import { escolherPerfil } from "./actions";

export const metadata = { title: "Seu perfil · radioOn" };

const perfis = [
  { role: "listener", label: "Ouvinte", dica: "Ouça e ganhe pontos", Icon: Headphones },
  { role: "artist", label: "Artista", dica: "Envie sua música", Icon: Mic2 },
  { role: "curator", label: "Curador", dica: "Monte playlists", Icon: ListMusic },
] as const;

async function Conteudo({ searchParams }: Pick<PageProps<"/onboarding">, "searchParams">) {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/onboarding"));
  const { erro } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Como você vai usar o radioOn?</h1>
      {erro && <Mensagem tipo="erro">Não deu certo. Tente de novo.</Mensagem>}
      <form action={escolherPerfil} className="flex flex-col gap-3">
        <input
          name="nome"
          maxLength={80}
          autoComplete="nickname"
          placeholder="Seu nome (opcional)"
          aria-label="Nome"
          className={campo}
        />
        {perfis.map(({ role, label, dica, Icon }) => (
          <button
            key={role}
            name="role"
            value={role}
            className="flex min-h-16 items-center gap-4 rounded-lg bg-white/10 px-4 py-3 text-left transition-colors hover:bg-white/15"
          >
            <Icon className="size-6 shrink-0 text-brand" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-lg font-semibold">{label}</span>
              <span className="text-sm text-white/70">{dica}</span>
            </span>
          </button>
        ))}
      </form>
    </>
  );
}

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <Tela centro>
      <Suspense>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}
