import { Headphones, ListMusic, Mic2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSessionRole } from "@/lib/session";

import { escolherPerfil } from "./actions";

export const metadata = { title: "Seu perfil · radioOn" };

const perfis = [
  { role: "listener", label: "Ouvinte", Icon: Headphones },
  { role: "artist", label: "Artista", Icon: Mic2 },
  { role: "curator", label: "Curador", Icon: ListMusic },
] as const;

async function Conteudo({ searchParams }: Pick<PageProps<"/onboarding">, "searchParams">) {
  const sessao = await getSessionRole();
  if (!sessao) redirect("/login");
  const { erro } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Como você vai usar o radioOn?</h1>
      {erro && <p role="alert" className="text-sm text-brand-2">Não deu certo. Tente de novo.</p>}
      <form action={escolherPerfil} className="flex flex-col gap-4">
        <input
          name="nome"
          maxLength={80}
          placeholder="Seu nome (opcional)"
          aria-label="Nome"
          className="w-full rounded-lg bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-brand"
        />
        {perfis.map(({ role, label, Icon }) => (
          <button
            key={role}
            name="role"
            value={role}
            className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-4 text-left text-lg font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Icon className="size-6 text-brand" aria-hidden="true" /> {label}
          </button>
        ))}
      </form>
    </>
  );
}

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Suspense>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
