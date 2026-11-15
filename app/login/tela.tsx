import { Suspense } from "react";

import { ConteudoLogin } from "@/components/conteudo-login";
import { Frase } from "@/components/frase";
import { Mensagem, Tela } from "@/components/ui";
import { safeNext } from "@/lib/auth/roles";

type Busca = Promise<Record<string, string | string[] | undefined>>;

function primeiro(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

async function Erro({ searchParams }: { searchParams: Busca }) {
  const erro = primeiro((await searchParams).erro);
  if (!erro) return null;
  return <Mensagem tipo="erro">{erro === "google" ? "Não foi possível entrar com Google agora. Use o e-mail." : "O link expirou ou é inválido. Peça outro."}</Mensagem>;
}

async function Formulario({ searchParams }: { searchParams: Busca }) {
  return <ConteudoLogin logo={false} next={safeNext(primeiro((await searchParams).next), "")} />;
}

/** Tela direta de login (`/entrar` e `/login`): o mesmo conteúdo do painel inferior, em página inteira. */
export function TelaLogin({ searchParams }: { searchParams: Busca }) {
  return (
    <Tela centro>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold text-balance">Entre na radioOn</h1>
        <Frase />
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
