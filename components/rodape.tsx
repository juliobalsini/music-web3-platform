import Link from "next/link";

const link = "foco-claro inline-flex min-h-11 items-center underline underline-offset-4 hover:text-white";

/** Rodapé com os textos legais (LGPD). Aparece em todas as telas, acima da navegação inferior. */
export function Rodape() {
  return (
    <footer className="mx-auto mt-10 flex w-full max-w-md items-center justify-center gap-6 px-6 text-sm text-white/70">
      <Link href="/ajustes" className={link}>Ajustes</Link>
      <Link href="/privacidade" className={link}>Privacidade</Link>
      <Link href="/termos" className={link}>Termos</Link>
    </footer>
  );
}

/** Aviso curto no login: entrar implica ler os termos e a privacidade. */
export function AceiteLegal() {
  return (
    <p className="text-sm text-white/70 text-pretty">
      Ao entrar, você concorda com os{" "}
      <Link href="/termos" className="foco-claro underline underline-offset-4 hover:text-white">Termos</Link> e com a{" "}
      <Link href="/privacidade" className="foco-claro underline underline-offset-4 hover:text-white">Política de Privacidade</Link>.
    </p>
  );
}
