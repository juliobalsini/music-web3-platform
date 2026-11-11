import { redirect } from "next/navigation";
import { Suspense } from "react";

import { StoryForm } from "@/components/story-form";
import { Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { carregarRadio } from "@/lib/radio/queries";
import { getSessionRole } from "@/lib/session";
import { idsDaPlataforma, podePublicarStory } from "@/lib/stories/rules";

export const metadata = { title: "Novo story · radioOn" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/stories/novo"));
  if (!podePublicarStory(sessao.role, sessao.userId, idsDaPlataforma(process.env.PLATFORM_STORY_IDS)).pode) redirect("/onboarding");
  const radio = await carregarRadio();
  const faixas = radio.faixas.map((f) => ({ id: f.id, title: f.title, artistName: f.artistName, durationSec: f.durationSec }));
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Novo story</h1>
      <p className="text-white/70 text-pretty">Texto, imagem e um trecho de 15 segundos de uma faixa. Fica 7 dias na Rádio e depois no seu perfil.</p>
      <StoryForm faixas={faixas} />
    </>
  );
}

export default function NovoStoryPage() {
  return (
    <Tela>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
