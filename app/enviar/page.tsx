import { redirect } from "next/navigation";
import { Suspense } from "react";

import { UploadForm } from "@/components/upload-form";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Enviar faixa · radioOn" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect("/login");
  if (sessao.role !== "artist") redirect("/onboarding");
  return (
    <>
      <h1 className="text-2xl font-semibold">Enviar faixa</h1>
      <UploadForm />
    </>
  );
}

export default function EnviarPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Suspense>
        <Conteudo />
      </Suspense>
    </main>
  );
}
