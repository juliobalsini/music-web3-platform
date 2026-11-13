import { redirect } from "next/navigation";
import { Suspense } from "react";

import { NovaPlaylist } from "@/components/nova-playlist";
import { Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Nova playlist · radioOn" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/playlist/nova"));
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Nova playlist</h1>
      <p className="text-white/70 text-pretty">Ela começa como rascunho privado. Você monta e só publica quando quiser.</p>
      <NovaPlaylist />
    </>
  );
}

export default function NovaPlaylistPage() {
  return (
    <Tela>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
