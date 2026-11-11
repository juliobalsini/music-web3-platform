import { BookOpen, Clock, Compass, Headphones, ListMusic, LogIn, Play, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { botao, linha, Mensagem, Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { listenConfig } from "@/lib/listen/config";
import { acoesMinhaRadio } from "@/lib/menu";
import { progressoMeta, resumirMinhaRadio } from "@/lib/radio/minha";
import { carregarRadio } from "@/lib/radio/queries";
import { getSessaoAny } from "@/lib/session";
import { metricasDoArtista } from "@/lib/tracks/queries";

export const metadata = { title: "Minha rádio · radioOn" };

const icones = { enviar: Upload, playlists: ListMusic, perfil: UserRound } as const;
const motivos: Record<string, string> = { listen: "Escuta" };

async function Conteudo() {
  const sessao = await getSessaoAny();
  if (!sessao) redirect(loginPath("/minha-radio"));
  const { supabase, userId, role, anonimo } = sessao;
  const cfg = listenConfig();
  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(0, 0, 0, 0); // dia de pontos em UTC (igual ao banco)

  // RLS: cada usuário só enxerga as próprias escutas e o próprio extrato.
  const [{ data: pontos, error: erroPontos }, { data: eventos }, radio] = await Promise.all([
    supabase.from("points_ledger").select("id,amount,reason,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("listen_events").select("track_id,seconds_listened,is_valid").limit(5000),
    carregarRadio(),
  ]);
  const extrato = pontos ?? [];
  const total = extrato.reduce((s, l) => s + l.amount, 0);
  const hoje = extrato
    .filter((l) => l.reason === "listen" && new Date(l.created_at) >= inicioDoDia)
    .reduce((s, l) => s + l.amount, 0);
  const plays = new Map(radio.faixas.map((f) => [f.id, f.plays]));
  const resumo = resumirMinhaRadio(eventos ?? [], plays);
  const meta = progressoMeta(hoje, cfg.dailyLimit);
  const minhasFaixas = role === "artist" ? await metricasDoArtista(userId) : [];

  const dados = [
    { Icone: Headphones, rotulo: "Escutas válidas", valor: resumo.escutas },
    { Icone: Clock, rotulo: "Minutos ouvidos", valor: resumo.minutos },
    { Icone: Compass, rotulo: "Descobertas", valor: resumo.descobertas },
    { Icone: BookOpen, rotulo: "Pontos no total", valor: total },
  ];

  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Minha rádio</h1>

      <section aria-label="Meta de hoje" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Meta de hoje</h2>
          <p className="text-sm text-white/70 tabular-nums" data-testid="meta">
            {hoje} de {cfg.dailyLimit} pontos
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Pontos de hoje"
          aria-valuemin={0}
          aria-valuemax={cfg.dailyLimit}
          aria-valuenow={Math.min(hoje, cfg.dailyLimit)}
          className="h-3 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${meta}%` }} />
        </div>
        {erroPontos ? (
          <Mensagem>Pontos indisponíveis agora. Tente de novo em instantes.</Mensagem>
        ) : extrato.length === 0 ? (
          <p className="text-sm text-white/70 text-pretty">Sem pontos ainda. Ouça uma faixa por 30 segundos e ganhe os primeiros.</p>
        ) : hoje >= cfg.dailyLimit ? (
          <p className="text-sm text-white/70">Meta batida. Os pontos voltam amanhã.</p>
        ) : null}
      </section>

      <ul aria-label="Resumo" className="flex flex-col gap-2">
        {dados.map(({ Icone, rotulo, valor }) => (
          <li key={rotulo} className={linha}>
            <span className="flex items-center gap-3">
              <Icone className="size-5 text-brand" aria-hidden="true" />
              {rotulo}
            </span>
            <span className="font-semibold tabular-nums" data-testid={`dado-${rotulo.split(" ")[0].toLowerCase()}`}>{valor}</span>
          </li>
        ))}
      </ul>

      {extrato.length === 0 && (
        <Link href="/" className={botao}>
          <Play className="size-5" aria-hidden="true" /> Ouvir agora
        </Link>
      )}

      {anonimo && (
        <section aria-label="Salvar pontos" className="flex flex-col gap-2 rounded-lg bg-white/10 px-4 py-4">
          <p className="font-semibold text-balance">Seus pontos estão só neste aparelho.</p>
          <p className="text-sm text-white/70 text-pretty">Entre para guardá-los na sua conta, enviar música, criar playlist e resgatar recompensas. Nada se perde.</p>
          <Link href="/login?next=/minha-radio" className={botao}>
            <LogIn className="size-5" aria-hidden="true" /> Salvar meus pontos
          </Link>
        </section>
      )}

      {!anonimo && acoesMinhaRadio(role).map(({ href, label, icone, destaque }) => {
        const Icone = icones[icone];
        return (
          <Link key={href} href={href} className={destaque ? botao : `${linha} min-h-12`}>
            <Icone className="size-5" aria-hidden="true" /> {label}
          </Link>
        );
      })}

      {role === "artist" && (
        <section aria-label="Minhas faixas" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Minhas faixas</h2>
          {minhasFaixas === null ? (
            <Mensagem>Suas faixas estão indisponíveis agora. Tente de novo em instantes.</Mensagem>
          ) : minhasFaixas.length === 0 ? (
            <p className="text-white/70 text-pretty">Nenhuma faixa publicada ainda. Suas escutas aparecem aqui.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {minhasFaixas.map(({ faixa, metrica }) => (
                <li key={faixa.id} className={`${linha} flex-wrap`}>
                  <span className="min-w-0 flex-1 basis-40 truncate font-medium">{faixa.title}</span>
                  <span className="shrink-0 text-sm text-white/70 tabular-nums">
                    {metrica.escutas} escutas · {metrica.ouvintes} ouvintes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {extrato.length > 0 && (
        <section aria-label="Últimos pontos" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Últimos pontos</h2>
          <ul className="flex flex-col gap-2">
            {extrato.slice(0, 5).map((l) => (
              <li key={l.id} className={linha}>
                <span className="flex flex-col">
                  <span>{motivos[l.reason] ?? l.reason}</span>
                  <time dateTime={l.created_at} className="text-sm text-white/70">
                    {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </time>
                </span>
                <span className="font-semibold text-brand tabular-nums">+{l.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function MinhaRadioPage() {
  return (
    <Tela>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
