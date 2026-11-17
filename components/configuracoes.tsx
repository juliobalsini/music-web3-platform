"use client";
/* eslint-disable @next/next/no-img-element -- avatar externo (Google) ou redirecionado ao bucket, sem otimizador (cota). */

import { Camera, Check, Download, ImagePlus, Moon, SunMedium, SunMoon, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { definirFoto, excluir, salvarNome, salvarPerfilArtista, salvarPreferencias, trocarEmail, type Resultado } from "@/app/ajustes/actions";
import { Ajuda, Interruptor, PainelInferior } from "@/components/ds/interativos";
import { BotaoEntrar } from "@/components/login-contextual";
import { abrirFoto, enviarImagem, RecorteFoto, type Foto } from "@/components/recorte-foto";
import { botao, campo, Mensagem } from "@/components/ui";
import { gravarPreferencias, usePreferencias } from "@/lib/preferencias/cliente";
import { DESTAQUES, EQS, GENEROS_GOSTO, MAX_GOSTOS, PALAVRA_EXCLUIR, TEMAS, type Destaque, type Eq, type Preferencias, type Tema } from "@/lib/preferencias/rules";
import { rotuloGenero, type GeneroId } from "@/lib/radio/generos";
import { MAX_BIO } from "@/lib/stories/bio";

export type DadosConta = {
  /** Necessário para enviar a foto própria (rota /api/perfil/<id>/foto). */
  id?: string;
  nome: string | null;
  email: string | null;
  foto: string | null;
  /** A foto atual é a própria (enviada na radioOn), não a do Google. */
  fotoPropria?: boolean;
  /** Perfil de artista: story de bio (frase e foto pública). */
  artista?: boolean;
  bio?: string | null;
  fotoNoPerfil?: boolean;
};

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
  const cor = perigo ? "!bg-none !bg-[var(--ds-erro)] !text-sobre-destaque" : "";
  return (
    <button disabled={pending || desabilitado} className={`${botao} ${cor}`}>
      {pending ? "Salvando…" : children}
    </button>
  );
}

const OPCAO_TEMA: Record<Tema, { nome: string; Icone?: typeof Moon }> = {
  escuro: { nome: "Escuro", Icone: Moon },
  claro: { nome: "Claro", Icone: SunMedium },
  auto: { nome: "Sistema", Icone: SunMoon },
};

const OPCAO_EQ: Record<Eq, { nome: string }> = {
  plano: { nome: "Normal" },
  graves: { nome: "Graves" },
  voz: { nome: "Voz" },
  agudos: { nome: "Agudos" },
};

/** Controle segmentado: rádios nativos (setas do teclado, leitor de tela), alvos de 48 px. */
function Segmentado<T extends string>({
  titulo,
  nome,
  valores,
  opcoes,
  valor,
  aoMudar,
}: {
  titulo: string;
  nome: string;
  valores: readonly T[];
  opcoes: Record<T, { nome: string; Icone?: typeof Moon }>;
  valor: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3 p-4">
      <legend className="float-left mb-1 font-semibold">{titulo}</legend>
      <div
        style={{ gridTemplateColumns: `repeat(${valores.length}, minmax(0, 1fr))` }}
        className="clear-left grid gap-1 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] p-1"
      >
        {valores.map((v) => {
          const { nome: rotulo, Icone } = opcoes[v];
          return (
            <label key={v} className="relative cursor-pointer">
              <input
                type="radio"
                name={nome}
                value={v}
                checked={valor === v}
                onChange={() => aoMudar(v)}
                data-testid={`pref-${nome}-${v}`}
                className="peer sr-only"
              />
              <span className="flex min-h-12 items-center justify-center gap-2 rounded-[calc(var(--ds-raio)-0.25rem)] px-1 text-sm font-semibold text-[var(--ds-texto-2)] transition-colors duration-[var(--ds-mov-rapido)] peer-checked:bg-[var(--ds-surface-2)] peer-checked:text-[var(--ds-texto)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ds-destaque)]">
                {Icone && <Icone className="size-4" aria-hidden="true" />}
                {rotulo}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const NOME_DESTAQUE: Record<Destaque, string> = { ambar: "Âmbar", azul: "Azul", verde: "Verde", rosa: "Rosa", lilas: "Lilás" };

/** Cor de destaque: rádios nativos (setas do teclado, leitor de tela) com amostras redondas de 44 px. */
function EscolherDestaque({ valor, aoMudar }: { valor: Destaque; aoMudar: (d: Destaque) => void }) {
  return (
    <fieldset className="flex flex-col gap-3 p-4">
      <legend className="float-left mb-1 font-semibold">Cor de destaque</legend>
      <div className="clear-left flex flex-wrap gap-3">
        {DESTAQUES.map((d) => (
          <label key={d} className="flex cursor-pointer flex-col items-center gap-1 text-xs text-[var(--ds-texto-2)]">
            <input
              type="radio"
              name="destaque"
              value={d}
              checked={valor === d}
              onChange={() => aoMudar(d)}
              data-testid={`pref-destaque-${d}`}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              data-cor={d}
              className="ds-amostra flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-[var(--ds-bg)] transition-shadow duration-[var(--ds-mov-rapido)] peer-checked:ring-2 peer-checked:ring-[var(--ds-texto)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--ds-texto)]"
            >
              {valor === d && <Check className="size-5" strokeWidth={2.5} />}
            </span>
            {NOME_DESTAQUE[d]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Seus gostos: caixas nativas em chips (alvo de 44 px); no máx. 5, as demais ficam indisponíveis até desmarcar uma. */
function EscolherGostos({ valor, aoMudar }: { valor: GeneroId[]; aoMudar: (g: GeneroId[]) => void }) {
  const cheio = valor.length >= MAX_GOSTOS;
  return (
    <fieldset className="flex flex-col gap-3 p-4" aria-describedby="gostos-contagem">
      <legend className="float-left mb-1 font-semibold">Gêneros que você curte</legend>
      <p id="gostos-contagem" aria-live="polite" className="clear-left text-sm tabular-nums text-[var(--ds-texto-2)]">
        {valor.length} de {MAX_GOSTOS}
      </p>
      <div className="flex flex-wrap gap-2">
        {GENEROS_GOSTO.map((g) => {
          const marcado = valor.includes(g);
          return (
            <label key={g} className="cursor-pointer has-[:disabled]:cursor-not-allowed">
              <input
                type="checkbox"
                checked={marcado}
                disabled={!marcado && cheio}
                onChange={() => aoMudar(marcado ? valor.filter((x) => x !== g) : [...valor, g])}
                data-testid={`pref-gosto-${g}`}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--ds-borda)] px-4 text-sm font-semibold text-[var(--ds-texto-2)] transition-colors duration-[var(--ds-mov-rapido)] peer-checked:border-transparent peer-checked:bg-[var(--ds-destaque)] peer-checked:text-sobre-destaque peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ds-texto)]">
                {marcado && <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />}
                {rotuloGenero(g)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
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

  function mudar<K extends keyof Preferencias>(k: K, v: Preferencias[K]) {
    gravarPreferencias({ [k]: v });
    if (!conta) return;
    setErroConta(null);
    void salvarPreferencias({ [k]: v })
      .then((r) => !r.ok && setErroConta(r.erro))
      .catch(() => setErroConta("Sem conexão. Vale neste aparelho."));
  }

  return (
    <div className="flex flex-col gap-8">
      <Secao titulo="Aparência">
        <div className={grupo}>
          <Segmentado titulo="Tema" nome="tema" valores={TEMAS} opcoes={OPCAO_TEMA} valor={prefs.tema} aoMudar={(t) => mudar("tema", t)} />
          <EscolherDestaque valor={prefs.destaque} aoMudar={(d) => mudar("destaque", d)} />
          <Interruptor titulo="Texto maior" ligado={prefs.textoMaior} aoMudar={(v) => mudar("textoMaior", v)} testId="pref-texto-maior" />
          <Interruptor titulo="Reduzir animações" apoio="Telas sem movimento." ligado={prefs.reduzirAnimacoes} aoMudar={(v) => mudar("reduzirAnimacoes", v)} testId="pref-reduzir-animacoes" />
        </div>
      </Secao>

      <Secao titulo="Seus gostos">
        <div className={grupo}>
          <EscolherGostos valor={prefs.gostos} aoMudar={(g) => mudar("gostos", g)} />
        </div>
        <Ajuda titulo="Para que serve">
          As playlists da Seleção radioOn desses gêneros aparecem primeiro na Home. Escolha até {MAX_GOSTOS}; dá para mudar quando quiser.
        </Ajuda>
      </Secao>

      <Secao titulo="Reprodução">
        <div className={grupo}>
          <Interruptor titulo="Normalizar volume" apoio="Faixas com volume parecido." ligado={prefs.normalizar} aoMudar={(v) => mudar("normalizar", v)} testId="pref-normalizar" />
          <Interruptor titulo="Reprodução contínua" apoio="Ao fim da faixa, toca a próxima." ligado={prefs.continua} aoMudar={(v) => mudar("continua", v)} testId="pref-continua" />
          <Interruptor titulo="Som nos stories" apoio="Stories abrem com som." ligado={prefs.somStories} aoMudar={(v) => mudar("somStories", v)} testId="pref-som-stories" />
          <Segmentado titulo="Equalizador" nome="eq" valores={EQS} opcoes={OPCAO_EQ} valor={prefs.eq} aoMudar={(e) => mudar("eq", e)} />
        </div>
        <Ajuda titulo="Sobre o equalizador">
          Graves reforça o grave, Voz destaca vozes e Agudos dá brilho. Vale para as faixas do player, na hora, e não muda o arquivo do artista.
          Se o navegador não permitir, a faixa toca normal.
        </Ajuda>
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
          {conta.artista && <SecaoArtista conta={conta} />}
          <Secao titulo="Privacidade">
            <div className={grupo}>
              <Interruptor titulo="Perfil público" apoio="Outras pessoas veem seu perfil." ligado={prefs.perfilPublico} aoMudar={(v) => mudar("perfilPublico", v)} testId="pref-perfil-publico" />
              <Interruptor titulo="Mostrar o que estou ouvindo" ligado={prefs.mostrarOuvindo} aoMudar={(v) => mudar("mostrarOuvindo", v)} testId="pref-ouvindo" />
              {conta.artista && (
                <Interruptor titulo="Story de bio" apoio="Seu card em Artistas para conhecer." ligado={prefs.storyBio} aoMudar={(v) => mudar("storyBio", v)} testId="pref-story-bio" />
              )}
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
        <FotoPerfil conta={conta} />
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
        <a
          href="/api/conta/exportar"
          download
          data-testid="exportar-dados"
          className="foco-claro flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--ds-borda)] px-5 font-semibold text-[var(--ds-texto)] transition-colors duration-[var(--ds-mov-rapido)] hover:bg-[var(--ds-surface-2)]"
        >
          <Download className="size-5" aria-hidden="true" /> Baixar meus dados
        </a>
      </div>
      <Ajuda titulo="O que vem no arquivo">
        Um arquivo JSON com seu perfil, ajustes, faixas, álbuns, playlists, stories, reações, quem você segue, escutas e extrato de
        pontos. Os arquivos de áudio e as imagens não entram.
      </Ajuda>
    </Secao>
  );
}

/** Lado da foto de perfil salva (px): sobra para telas densas e fica bem abaixo de 2 MB. */
const LADO_FOTO = 640;

/**
 * Foto do perfil: toque abre "Foto do perfil" com escolher (recorte quadrado com máscara redonda, JPEG gerado no navegador
 * e enviado direto ao bucket) ou remover a própria (volta à do Google ou à inicial).
 */
function FotoPerfil({ conta }: { conta: DadosConta }) {
  const router = useRouter();
  const [foto, setFotoAtual] = useState(conta.foto);
  const [propria, setPropria] = useState(!!conta.fotoPropria);
  const [aberto, setAberto] = useState(false);
  const [edicao, setEdicao] = useState<Foto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const trocarEdicao = (nova: Foto | null) =>
    setEdicao((velha) => {
      if (velha && velha !== nova) velha.bmp.close();
      return nova;
    });
  const fechar = () => {
    if (enviando) return;
    setAberto(false);
    trocarEdicao(null);
    setErro(null);
  };
  const escolher = async (f: File | undefined) => {
    setErro(null);
    if (!f) return;
    const r = await abrirFoto(f);
    if (typeof r === "string") return setErro(r);
    trocarEdicao(r);
  };
  const gravar = async (key: string | null) => {
    const r = await definirFoto(key);
    if (!r.ok) return setErro(r.erro);
    setFotoAtual(r.foto);
    setPropria(key !== null);
    setAberto(false);
    trocarEdicao(null);
    router.refresh();
  };
  const usar = async (jpeg: Blob | null) => {
    if (!jpeg) return setErro("Não deu para preparar a imagem. Tente outra.");
    if (!conta.id) return setErro("Entre na sua conta para continuar.");
    setEnviando(true);
    setErro(null);
    try {
      const r = await enviarImagem(`/api/perfil/${conta.id}/foto`, jpeg);
      if ("erro" in r) return setErro(r.erro);
      await gravar(r.key);
    } finally {
      setEnviando(false);
    }
  };
  const remover = async () => {
    setEnviando(true);
    setErro(null);
    try { await gravar(null); } finally { setEnviando(false); }
  };

  const legenda = propria ? "Sua foto na radioOn." : foto ? "Foto da sua conta Google." : "Sua inicial aparece no lugar da foto.";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Trocar foto do perfil"
        data-testid="trocar-foto"
        className="group relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {foto ? (
          <img src={foto} alt="" width={56} height={56} referrerPolicy="no-referrer" className="size-14 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xl font-bold text-sobre-destaque">
            {(conta.nome ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-brand text-sobre-destaque shadow-[0_2px_8px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-out group-active:scale-90" aria-hidden="true">
          <Camera className="size-3.5" />
        </span>
      </button>
      <p aria-live="polite" className="min-w-0 text-sm text-[var(--ds-texto-2)] text-pretty">{legenda}</p>

      <PainelInferior aberto={aberto} aoFechar={fechar} titulo="Foto do perfil">
        <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
        {edicao ? (
          <RecorteFoto foto={edicao} rotulo="Enquadramento da foto" usar="Usar esta foto" enviando={enviando} erro={erro} aoUsar={usar} aoTrocar={() => arquivo.current?.click()} redondo ladoMax={LADO_FOTO} />
        ) : (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => arquivo.current?.click()} className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--ds-surface)] px-4 text-left font-semibold transition-colors hover:bg-[var(--ds-surface-2)]" data-testid="escolher-foto">
              <ImagePlus className="size-5 shrink-0 text-brand" aria-hidden="true" /> Escolher foto
            </button>
            {propria && (
              <button type="button" onClick={remover} disabled={enviando} className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--ds-surface)] px-4 text-left font-semibold transition-colors hover:bg-[var(--ds-surface-2)] disabled:opacity-60" data-testid="remover-foto">
                <Trash2 className="size-5 shrink-0 text-brand" aria-hidden="true" /> Remover minha foto
              </button>
            )}
            {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          </div>
        )}
      </PainelInferior>
    </div>
  );
}

/** Perfil de artista: frase da bio e foto pública. Com foto, nome e uma faixa publicada, o story de bio entra no ar. */
function SecaoArtista({ conta }: { conta: DadosConta }) {
  const [estado, acao] = useActionState(salvarPerfilArtista, null);
  const [bio, setBio] = useState(conta.bio ?? "");
  return (
    <Secao titulo="Perfil de artista">
      <form action={acao} className={`${grupo} divide-y-0 gap-4 p-4`}>
        <div className="flex flex-col gap-2">
          <label htmlFor="cfg-bio" className="text-sm font-semibold">Frase da bio</label>
          <textarea
            id="cfg-bio"
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            maxLength={MAX_BIO}
            rows={2}
            placeholder="O som que você faz, em uma frase"
            className={`${campo} min-h-20 resize-none py-3`}
          />
          <p aria-live="polite" className="self-end text-xs tabular-nums text-[var(--ds-texto-2)]">{bio.length}/{MAX_BIO}</p>
        </div>
        {conta.foto ? (
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" name="foto" value="1" defaultChecked={conta.fotoNoPerfil} className="size-5 accent-[var(--ds-destaque)]" />
            <span className="text-pretty">{conta.fotoPropria ? "Mostrar minha foto no perfil" : "Usar a foto da minha conta Google no perfil"}</span>
          </label>
        ) : (
          <p className="text-sm text-pretty text-[var(--ds-texto-2)]">Escolha uma foto em Conta, logo acima, para mostrar no perfil.</p>
        )}
        <Retorno estado={estado} />
        <Enviar>Salvar perfil</Enviar>
      </form>
      <Ajuda titulo="Como funciona o story de bio">
        Com foto, nome e ao menos uma faixa publicada, seu story de bio aparece em Artistas para conhecer e no Explorar: foto,
        gênero principal, esta frase e 15 s da sua faixa mais ouvida, com Ouvir e Seguir. Ele se atualiza sozinho e não expira.
        Para tirar do ar, desligue Story de bio em Privacidade.
      </Ajuda>
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
