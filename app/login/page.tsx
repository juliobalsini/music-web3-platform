import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { Mensagem, Tela } from "@/components/ui";

export const metadata = { title: "Entrar · radioOn" };

async function Erro({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { erro } = await searchParams;
  if (!erro) return null;
  return <Mensagem tipo="erro">O link expirou ou é inválido. Peça outro.</Mensagem>;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Tela centro>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">Entrar</h1>
        <p className="text-white/70">Sem senha: enviamos um link ao seu e-mail.</p>
      </div>
      <Suspense>
        <Erro searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </Tela>
  );
}
