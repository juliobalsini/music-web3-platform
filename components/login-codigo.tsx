"use client";

import { KeyRound, Mail } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { enviarCodigo, verificarCodigo, type CodigoState } from "@/app/login/actions";
import { botao, campo, Mensagem } from "@/components/ui";
import { normalizarCodigo, segundosParaReenviar } from "@/lib/auth/codigo";

/** Etapa 1: e-mail → "Receber código". Etapa 2: campo único de 6 dígitos (verifica sozinho ao completar). */
export function LoginCodigo({ next = "", antes }: { next?: string; antes?: React.ReactNode }) {
  const [envio, enviar, enviando] = useActionState<CodigoState, FormData>(enviarCodigo, {});
  // "Trocar e-mail" guarda qual envio foi descartado (sem comparar relógios do servidor e do aparelho).
  const [descartado, setDescartado] = useState<number | undefined>(undefined);
  const etapaCodigo = envio.etapa === "codigo" && !!envio.email && envio.enviadoEm !== descartado;

  if (etapaCodigo) {
    return (
      <EtapaCodigo
        key={envio.enviadoEm}
        next={next}
        envio={envio}
        reenviar={enviar}
        reenviando={enviando}
        aoTrocarEmail={() => setDescartado(envio.enviadoEm)}
      />
    );
  }
  return (
    <form action={enviar} className="flex flex-col gap-4">
      {antes}
      {antes && <p aria-hidden="true" className="text-center text-sm text-white/60">ou</p>}
      <input
        name="email"
        type="email"
        required
        defaultValue={envio.email}
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="seu@email.com"
        aria-label="E-mail"
        className={campo}
      />
      <button disabled={enviando} className={botao}>
        <Mail className="size-5" aria-hidden="true" /> {enviando ? "Enviando…" : "Receber código"}
      </button>
      {envio.erro && <Mensagem tipo="erro">{envio.erro}</Mensagem>}
    </form>
  );
}

function EtapaCodigo({
  next,
  envio,
  reenviar,
  reenviando,
  aoTrocarEmail,
}: {
  next: string;
  envio: CodigoState;
  reenviar: (f: FormData) => void;
  reenviando: boolean;
  aoTrocarEmail: () => void;
}) {
  const [estado, verificar, verificando] = useActionState<CodigoState, FormData>(verificarCodigo, {});
  const [codigo, setCodigo] = useState("");
  // Contagem do reenvio pelo relógio do aparelho, a partir de quando esta etapa abriu.
  const [inicio] = useState(() => Date.now());
  const [agora, setAgora] = useState(inicio);
  const form = useRef<HTMLFormElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const restante = segundosParaReenviar(inicio, agora);

  useEffect(() => {
    campoRef.current?.focus();
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Entrou: recarrega a página de destino inteira (todos os componentes leem a sessão nova).
  useEffect(() => {
    if (estado.entrou) window.location.assign(estado.entrou);
  }, [estado.entrou]);

  // Código errado: limpa e volta o foco para digitar de novo.
  useEffect(() => {
    if (estado.erro) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reação a uma resposta do servidor
      setCodigo("");
      campoRef.current?.focus();
    }
  }, [estado]);

  function aoDigitar(valor: string) {
    const v = normalizarCodigo(valor);
    setCodigo(v);
    if (v.length === 6 && !verificando) queueMicrotask(() => form.current?.requestSubmit());
  }

  function pedirOutro() {
    const f = new FormData();
    f.set("email", envio.email ?? "");
    startTransition(() => reenviar(f));
  }

  const ocupado = verificando || !!estado.entrou;
  return (
    <div className="flex flex-col gap-4" data-testid="etapa-codigo">
      <p role="status" className="text-pretty text-white/80">
        Enviamos um código para <strong className="text-white">{envio.email}</strong>.
      </p>
      <form ref={form} action={verificar} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={envio.email} />
        <input type="hidden" name="tipo" value={envio.tipo} />
        <input type="hidden" name="enviadoEm" value={envio.enviadoEm} />
        <input type="hidden" name="next" value={next} />
        <input
          ref={campoRef}
          name="codigo"
          value={codigo}
          onChange={(e) => aoDigitar(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={14}
          required
          placeholder="000000"
          aria-label="Código de 6 dígitos"
          aria-invalid={!!estado.erro}
          className={`${campo} text-center font-mono text-2xl tracking-[0.5em]`}
        />
        <button disabled={ocupado || codigo.length !== 6} className={botao}>
          <KeyRound className="size-5" aria-hidden="true" /> {ocupado ? "Entrando…" : "Entrar"}
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" onClick={aoTrocarEmail} className="min-h-11 px-1 text-white/80 underline underline-offset-4">
          Trocar e-mail
        </button>
        <button
          type="button"
          onClick={pedirOutro}
          disabled={restante > 0 || reenviando}
          className="min-h-11 px-1 tabular-nums text-brand underline underline-offset-4 disabled:text-white/50 disabled:no-underline"
        >
          {reenviando ? "Reenviando…" : restante > 0 ? `Reenviar em ${restante} s` : "Reenviar código"}
        </button>
      </div>
      <p className="text-sm text-white/60">Vale por 10 minutos. Confira também o spam.</p>
    </div>
  );
}
