import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EstadoVazio } from "@/components/ds";
import { Ajuda } from "@/components/ds/interativos";
import { UploadForm } from "@/components/upload-form";
import { botao, Mensagem, Tela } from "@/components/ui";
import { loginPath, papelNoEnvio } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

import { confirmarArtista } from "./actions";

export const metadata = { title: "Enviar faixa · radioOn" };

async function Conteudo({ searchParams }: Pick<PageProps<"/enviar">, "searchParams">) {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/enviar"));
  const { erro } = await searchParams;
  const papel = papelNoEnvio(sessao.role);
  if (papel === "confirma") {
    return (
      <>
        <h1 className="text-2xl font-semibold text-balance">Enviar faixa</h1>
        {erro && <Mensagem tipo="erro">Não deu certo. Tente de novo.</Mensagem>}
        <EstadoVazio
          titulo="Envie como artista"
          texto="Sua conta passa a ser de artista."
          acao={
            <form action={confirmarArtista}>
              <button className={botao}>Usar como artista</button>
            </form>
          }
        />
        <Ajuda titulo="O que muda?">
          Suas playlists continuam suas. Criar ou mudar a programação por horário fica só para playlisters.
        </Ajuda>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Enviar faixa</h1>
      {papel === "ativa" && <p className="text-sm text-[var(--ds-texto-2)]">Seu perfil de artista é ativado no primeiro envio.</p>}
      <UploadForm />
    </>
  );
}

export default function EnviarPage({ searchParams }: PageProps<"/enviar">) {
  return (
    <Tela centro>
      <Suspense>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}
