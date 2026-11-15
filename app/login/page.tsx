import { TelaLogin } from "./tela";

export const metadata = { title: "Entrar · radioOn" };

/** Destino dos redirecionamentos das páginas protegidas (`/login?next=`); mesmo conteúdo de `/entrar`. */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return <TelaLogin searchParams={searchParams} />;
}
