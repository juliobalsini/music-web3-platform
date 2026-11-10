import { redirect } from "next/navigation";
import { Suspense } from "react";

import { UploadForm } from "@/components/upload-form";
import { Tela } from "@/components/ui";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Enviar faixa · radioOn" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect("/login");
  if (sessao.role !== "artist") redirect("/onboarding");
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Enviar faixa</h1>
      <UploadForm />
    </>
  );
}

export default function EnviarPage() {
  return (
    <Tela centro>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
