import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Entrar · radioOn" };

async function Erro({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { erro } = await searchParams;
  if (!erro) return null;
  return <p role="alert" className="text-sm text-brand-2">O link expirou ou é inválido. Peça outro.</p>;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <Suspense>
        <Erro searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}
