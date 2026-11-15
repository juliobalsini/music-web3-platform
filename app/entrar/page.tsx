import { TelaLogin } from "@/app/login/tela";

export const metadata = { title: "Entrar · radioOn" };

/** Rota direta do login (issue #120): abre o mesmo conteúdo do painel inferior. */
export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return <TelaLogin searchParams={searchParams} />;
}
