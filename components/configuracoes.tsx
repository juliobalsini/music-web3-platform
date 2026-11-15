"use client";
/* eslint-disable @next/next/no-img-element -- avatar externo (Google), sem otimizador (cota). */

import { TriangleAlert } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { excluir, salvarNome, salvarPreferencias, trocarEmail, type Resultado } from "@/app/ajustes/actions";
import { Ajuda, Interruptor, PainelInferior } from "@/components/ds/interativos";
import { BotaoEntrar } from "@/components/login-contextual";
import { botao, campo, Mensagem } from "@/components/ui";
import { gravarPreferencias, usePreferencias } from "@/lib/preferencias/cliente";
import { PALAVRA_EXCLUIR, type Preferencias } from "@/lib/preferencias/rules";

export type DadosConta = { nome: string | null; email: string | null; foto: string | null };

const grupo = "flex flex-col divide-y divide-[var(--ds-borda)] overflow-hidden rounded-[var(--ds-raio)] bg-[var(--ds-surface)]";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="px-1 text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

function Enviar({ children, perigo = false, desabilitado = false }: { children: ReactNode; perigo?: boolean; desabilitado?: boolean }) {
  const { pending } = useFormStatus();
  const cor = perigo ? "!bg-none !bg-[var(--ds-erro)] !text-white" : "";
  return (
    <button disabled={pending || desabilitado} className={`${botao} ${cor}`}>
      {pending ? "Salvando…" : children}
    </button>
  );
}

function Retorno({ estado }: { estado: Resultado | null }) {
  if (!estado) return null;
  if (!estado.ok) return <Mensagem tipo="erro">{estado.erro}</Mensagem>;
  return estado.aviso ? <Mensagem>{estado.aviso}</Mensagem> : null;
}

/** Configurações: aparelho (todos) e conta (só quem entrou). Preferências salvam no aparelho e, com conta, na conta. */
export function Configuracoes({ conta }: { conta: DadosConta | null }) {
  const prefs = usePreferencias();
  const [erroConta, setErroConta] = useState<string | null>(null);

  function mudar(k: keyof Preferencias, v: boolean) {
    gravarPreferencias({ [k]: v });
    if (!conta) return;
    setErroConta(null);
    void salvarPreferencias({ [k]: v })
      .then((r) => !r.ok && setErroConta(r.erro))
      .catch(() => setErroConta("Sem conexão. Vale neste aparelho."));
  }

  return (
    <div className="flex flex-col gap-8">
      <Secao titulo="Reprodução">
        <div className={grupo}>
          <Interruptor titulo="Normalizar volume" apoio="Faixas com volume parecido." ligado={prefs.normalizar} aoMudar={(v) => mudar("normalizar", v)} testId="pref-normalizar" />
          <Interruptor titulo="Reprodução contínua" apoio="Ao fim da faixa, toca a próxima." ligado={prefs.continua} aoMudar={(v) => mudar("continua", v)} testId="pref-continua" />
          <Interruptor titulo="Som nos stories" apoio="Stories abrem com som." ligado={prefs.somStories} aoMudar={(v) => mudar("somStories", v)} testId="pref-som-stories" />
        </div>
      </Secao>

      <Secao titulo="Dados">
        <div className={grupo}>
          <Interruptor titulo="Economia de dados" apoio="Nada é baixado antes da hora." ligado={prefs.economia} aoMudar={(v) => mudar("economia", v)} testId="pref-economia" />
        </div>
        <Ajuda titulo="O que muda">
          A próxima faixa nunca é baixada antes da hora. Com a economia ligada, os stories também não pré-carregam o próximo e abrem sem som:
          o áudio só é baixado quando você toca no alto-falante.
        </Ajuda>
      </Secao>

      {erroConta && <Mensagem tipo="erro">{erroConta}</Mensagem>}

      {conta ? (
        <>
          <SecaoConta conta={conta} />
          <Secao titulo="Privacidade">
            <div className={grupo}>
              <Interruptor titulo="Perfil público" apoio="Outras pessoas veem seu perfil." ligado={prefs.perfilPublico} aoMudar={(v) => mudar("perfilPublico", v)} testId="pref-perfil-publico" />
              <Interruptor titulo="Mostrar o que estou ouvindo" ligado={prefs.mostrarOuvindo} aoMudar={(v) => mudar("mostrarOuvindo", v)} testId="pref-ouvindo" />
            </div>
            <Ajuda>
              Com o perfil privado, quem visita vê só seu nome; suas faixas e playlists publicadas continuam tocando na radioOn.
              Hoje nenhuma tela mostra o que você ouve; quando houver, ela seguirá esta escolha.
            </Ajuda>
          </Secao>
          <ExcluirConta />
        </>
      ) : (
        <Secao titulo="Conta">
          <div className={`${grupo} divide-y-0 gap-3 p-4`}>
            <p className="text-pretty text-[var(--ds-texto-2)]">Entre para guardar estes ajustes na sua conta e editar nome, e-mail e privacidade.</p>
            <BotaoEntrar motivo="Entre para guardar seus ajustes." className={`${botao} w-full`} />
          </div>
        </Secao>
      )}
    </div>
  );
}

function SecaoConta({ conta }: { conta: DadosConta }) {
  const [estNome, acaoNome] = useActionState(salvarNome, null);
  const [estEmail, acaoEmail] = useActionState(trocarEmail, null);
  return (
    <Secao titulo="Conta">
      <div className={`${grupo} divide-y-0 gap-5 p-4`}>
        <div className="flex items-center gap-3">
          {conta.foto ? (
            <img src={conta.foto} alt="" width={56} height={56} referrerPolicy="no-referrer" className="size-14 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xl font-bold text-night-900">
              {(conta.nome ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="text-sm text-[var(--ds-texto-2)] text-pretty">{conta.foto ? "Foto da sua conta Google." : "Sua inicial aparece no lugar da foto."}</p>
        </div>
        <form action={acaoNome} className="flex flex-col gap-2">
          <label htmlFor="cfg-nome" className="text-sm font-semibold">Nome</label>
          <input id="cfg-nome" name="nome" defaultValue={conta.nome ?? ""} maxLength={80} required autoComplete="name" className={campo} />
          <Retorno estado={estNome} />
          <Enviar>Salvar nome</Enviar>
        </form>
        <form action={acaoEmail} className="flex flex-col gap-2">
          <label htmlFor="cfg-email" className="text-sm font-semibold">E-mail</label>
          <input id="cfg-email" name="email" type="email" defaultValue={conta.email ?? ""} required autoComplete="email" inputMode="email" className={campo} />
          <Retorno estado={estEmail} />
          <Enviar>Trocar e-mail</Enviar>
        </form>
      </div>
    </Secao>
  );
}

/** Confirmação dupla: 1) o que acontece; 2) digitar EXCLUIR. */
function ExcluirConta() {
  const [passo, setPasso] = useState<0 | 1 | 2>(0);
  const [texto, setTexto] = useState("");
  const [estado, acao] = useActionState(excluir, null);
  const fechar = () => {
    setPasso(0);
    setTexto("");
  };
  return (
    <Secao titulo="Excluir conta">
      <button type="button" onClick={() => setPasso(1)} data-testid="excluir-conta" className="foco-claro flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--ds-erro)] px-5 font-semibold text-[var(--ds-erro)]">
        <TriangleAlert className="size-5" aria-hidden="true" /> Excluir minha conta
      </button>
      <PainelInferior aberto={passo > 0} aoFechar={fechar} titulo={passo === 1 ? "Excluir sua conta?" : "Confirme a exclusão"}>
        {passo === 1 ? (
          <>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-pretty text-[var(--ds-texto-2)]">
              <li>Suas faixas, álbuns, playlists e stories somem da radioOn.</li>
              <li>Nome, e-mail e foto são apagados da conta.</li>
              <li>Seus pontos não podem mais ser usados.</li>
              <li>Não dá para desfazer.</li>
            </ul>
            <button type="button" onClick={() => setPasso(2)} className="foco-claro min-h-12 rounded-lg border border-[var(--ds-erro)] px-5 font-semibold text-[var(--ds-erro)]">
              Continuar
            </button>
            <button type="button" onClick={fechar} className={botao}>Manter minha conta</button>
          </>
        ) : (
          <form action={acao} className="flex flex-col gap-3">
            <label htmlFor="cfg-confirmar" className="text-pretty">
              Digite <strong>{PALAVRA_EXCLUIR}</strong> para excluir.
            </label>
            <input id="cfg-confirmar" name="confirmacao" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" autoCapitalize="characters" className={campo} />
            <Retorno estado={estado} />
            <Enviar perigo desabilitado={texto.trim().toUpperCase() !== PALAVRA_EXCLUIR}>Excluir conta</Enviar>
          </form>
        )}
      </PainelInferior>
    </Secao>
  );
}
