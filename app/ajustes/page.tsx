import { Suspense } from "react";

import { Esqueleto } from "@/components/ds";
import { Configuracoes, type DadosConta } from "@/components/configuracoes";
import { Tela } from "@/components/ui";
import { fotoDaConta } from "@/lib/perfil/foto";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Configurações · radioOn" };

async function dadosConta(): Promise<DadosConta | null> {
  try {
    const s = await getSessionRole();
    if (!s) return null;
    const [{ data: u }, { data: p }] = await Promise.all([
      s.supabase.auth.getUser(),
      s.supabase.from("profiles").select("display_name").eq("id", s.userId).maybeSingle(),
    ]);
    // Colunas do story de bio (migration 20261115020000); antes de aplicada, a leitura falha e o formulário vem vazio.
    const artista = s.role === "artist";
    const { data: pb } = artista ? await s.supabase.from("profiles").select("bio,avatar_url").eq("id", s.userId).maybeSingle() : { data: null };
    const meta = (u.user?.user_metadata ?? {}) as Record<string, unknown>;
    const foto = fotoDaConta(meta, s.userId);
    const fotoPropria = !!foto?.startsWith("/");
    const nome = p?.display_name || (typeof meta.full_name === "string" ? meta.full_name : null);
    const perfil = (pb ?? null) as { bio: string | null; avatar_url: string | null } | null;
    return { id: s.userId, nome, email: u.user?.email ?? null, foto, fotoPropria, artista, bio: perfil?.bio ?? null, fotoNoPerfil: !!perfil?.avatar_url };
  } catch {
    return null; // sem Supabase (testes/prévias): só os ajustes do aparelho
  }
}

/** Configurações: Reprodução e Dados valem para todos (aparelho); Conta e Privacidade só com conta. */
async function Conteudo() {
  return <Configuracoes conta={await dadosConta()} />;
}

export default function AjustesPage() {
  return (
    <Tela>
      <h1 className="text-2xl font-semibold text-balance">Configurações</h1>
      <Suspense
        fallback={
          <div aria-busy="true" className="flex flex-col gap-3">
            <Esqueleto className="h-6 w-32" />
            <Esqueleto className="h-48 w-full" />
          </div>
        }
      >
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
