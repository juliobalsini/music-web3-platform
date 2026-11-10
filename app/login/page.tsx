import { Suspense } from "react";

import { Frase } from "@/components/frase";
import { LoginForm } from "@/components/login-form";
import { Mensagem, Tela } from "@/components/ui";
import { safeNext } from "@/lib/auth/roles";

export const metadata = { title: "Entrar · radioOn" };

async function Erro({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { erro } = await searchParams;
  if (!erro) return null;
  return <Mensagem tipo="erro">{erro === "google" ? "Não foi possível entrar com Google agora. Use o link por e-mail." : "O link expirou ou é inválido. Peça outro."}</Mensagem>;
}

async function Formulario({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={safeNext(Array.isArray(next) ? next[0] : next, "")} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Tela centro>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">Entrar</h1>
        <Frase className="mb-1" />
        <p className="text-white/70">Sem senha: enviamos um link ao seu e-mail.</p>
      </div>
      <Suspense>
        <Erro searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <Formulario searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}
