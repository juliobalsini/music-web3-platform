"use server";

import { revalidatePath } from "next/cache";

import { apagarEnvio, desfazerEnvio, renomearEnvio, type ResultadoEnvio } from "@/lib/envios/apagar";
import { isTipoEnvio, MAX_TITULO, parseTituloEnvio } from "@/lib/envios/rules";
import { isUuid } from "@/lib/playlists/rules";
import { catalogoMudou } from "@/lib/radio/cache-catalogo";
import { getSessionRole } from "@/lib/session";

/** Telas que listam envios: o item some (ou volta) na hora. */
function atualizar(tipo: string, id: string) {
  catalogoMudou();
  for (const p of ["/", "/explorar", "/biblioteca", "/meus-envios", "/minha-radio", "/stories"]) revalidatePath(p);
  const rota = tipo === "faixa" ? "faixa" : tipo;
  revalidatePath(`/${rota}/${id}`);
}

async function executar(acao: typeof apagarEnvio, tipo: unknown, id: unknown): Promise<ResultadoEnvio> {
  const sessao = await getSessionRole();
  if (!sessao) return { ok: false, erro: "Entre na sua conta para continuar." };
  if (!isTipoEnvio(tipo) || !isUuid(id)) return { ok: false, erro: "Item não encontrado." };
  try {
    const r = await acao(sessao.userId, tipo, id);
    if (r.ok) atualizar(tipo, id);
    return r;
  } catch {
    return { ok: false, erro: "Indisponível agora. Tente de novo." };
  }
}

/** Apagar (exclusão lógica, só o dono). Desfazer por 30 dias em Meus envios. */
export async function apagar(tipo: string, id: string): Promise<ResultadoEnvio> {
  return executar(apagarEnvio, tipo, id);
}

export async function desfazer(tipo: string, id: string): Promise<ResultadoEnvio> {
  return executar(desfazerEnvio, tipo, id);
}

/** Editar o título de uma faixa ou álbum próprio (playlists têm o editor próprio). */
export async function renomear(tipo: string, id: string, titulo: string): Promise<ResultadoEnvio> {
  if (tipo !== "faixa" && tipo !== "album") return { ok: false, erro: "Item não encontrado." };
  const t = parseTituloEnvio(titulo, MAX_TITULO[tipo]);
  if (!t) return { ok: false, erro: `Use de 1 a ${MAX_TITULO[tipo]} caracteres.` };
  return executar((u, tp, i) => renomearEnvio(u, tp as "faixa" | "album", i, t), tipo, id);
}
