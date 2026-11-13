import Link from "next/link";

/** Aviso curto no login: entrar implica ler os termos e a privacidade. (Os links legais ficam na gaveta do menu.) */
export function AceiteLegal() {
  return (
    <p className="text-sm text-white/70 text-pretty">
      Ao entrar, você concorda com os{" "}
      <Link href="/termos" className="foco-claro underline underline-offset-4 hover:text-white">Termos</Link> e com a{" "}
      <Link href="/privacidade" className="foco-claro underline underline-offset-4 hover:text-white">Política de Privacidade</Link>.
    </p>
  );
}
