import { ListMusic, LogIn, Star, Upload } from "lucide-react";
import Link from "next/link";

import { entrarComGoogle } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { botao } from "@/components/ui";

const beneficios = [
  { Icone: Star, titulo: "Salvar seus pontos", texto: "O que você ouve vira pontos na sua conta." },
  { Icone: ListMusic, titulo: "Criar playlists", texto: "Monte a sua seleção e compartilhe." },
  { Icone: Upload, titulo: "Enviar música", texto: "Artista independente? Publique sua faixa." },
] as const;

/** Convite do Perfil para visitante: benefícios em cartões e botão Entrar com Google. */
export function ConviteVisitante({ compacto = false }: { compacto?: boolean }) {
  return (
    <section aria-label="Entre no radioOn" className="flex flex-col items-center gap-5 text-center">
      {!compacto && <Logo className="h-28 w-auto" />}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-balance">{compacto ? "Seus pontos estão só neste aparelho" : "Entre para fazer parte"}</h2>
        <p className="text-white/70 text-pretty">Ouvir é livre. Com uma conta, nada se perde.</p>
      </div>
      <ul className="grid w-full gap-2">
        {beneficios.map(({ Icone, titulo, texto }) => (
          <li key={titulo} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-left">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900">
              <Icone className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="font-semibold">{titulo}</span>
              <span className="text-sm text-white/70">{texto}</span>
            </span>
          </li>
        ))}
      </ul>
      <form action={entrarComGoogle} className="flex w-full flex-col gap-2">
        <input type="hidden" name="next" value="/minha-radio" />
        <button className={`${botao} !bg-none !bg-white !text-night-900`}>
          <LogIn className="size-5" aria-hidden="true" /> Entrar com Google
        </button>
        <Link href="/login?next=/minha-radio" className="flex min-h-11 items-center justify-center text-sm font-semibold text-brand underline underline-offset-2">
          Prefiro entrar por e-mail
        </Link>
      </form>
    </section>
  );
}
