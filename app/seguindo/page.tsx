import { Compass } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BotaoSeguir } from "@/components/botao-seguir";
import { CartaoCapa, EstadoVazio, Esqueleto } from "@/components/ds";
import { Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { paraSeguidos } from "@/lib/seguir/rules";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Seguindo · radioOn" };

function Inicial({ nome }: { nome: string }) {
  return (
    <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-lg font-bold text-night-900">
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/seguindo"));
  const { data } = await sessao.supabase
    .from("follows")
    .select("followed_id, created_at, profiles!follows_followed_id_fkey(display_name)")
    .eq("follower_id", sessao.userId)
    .order("created_at", { ascending: false })
    .limit(200);
  const seguidos = paraSeguidos(data ?? []);
  if (seguidos.length === 0) {
    return (
      <EstadoVazio
        titulo="Você ainda não segue ninguém"
        texto="Siga artistas e playlisters pelo perfil deles."
        acao={
          <Link href="/explorar" className="foco-claro inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 font-bold text-night-900">
            <Compass className="size-5" aria-hidden="true" /> Explorar
          </Link>
        }
      />
    );
  }
  return (
    <ul aria-label="Perfis que você segue" data-testid="lista-seguindo" className="flex flex-col gap-2">
      {seguidos.map((p) => (
        <li key={p.id}>
          <CartaoCapa
            horizontal
            capa={<Inicial nome={p.nome} />}
            titulo={p.nome}
            apoio={<Link href={`/perfil/${p.id}`} className="foco-claro font-semibold text-brand underline underline-offset-2">Ver perfil</Link>}
            acao={<BotaoSeguir id={p.id} seguindo />}
          />
        </li>
      ))}
    </ul>
  );
}

export default function SeguindoPage() {
  return (
    <Tela>
      <h1 className="text-2xl font-semibold text-balance">Seguindo</h1>
      <Suspense
        fallback={
          <div aria-busy="true" className="flex flex-col gap-2">
            <Esqueleto className="h-[72px] w-full rounded-[var(--ds-raio)]" />
            <Esqueleto className="h-[72px] w-full rounded-[var(--ds-raio)]" />
          </div>
        }
      >
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
