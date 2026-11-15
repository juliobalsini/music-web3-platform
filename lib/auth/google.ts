/**
 * Login com Google Identity Services (botão oficial + One Tap; issue #120, fatia 2, DECISIONS 103).
 *
 * O Client ID é público (aparece no redirecionamento OAuth de qualquer visitante): fica como padrão no código,
 * com `NEXT_PUBLIC_GOOGLE_CLIENT_ID` como sobrescrita. O token de ID vai ao servidor, que chama
 * `signInWithIdToken` com o nonce cru; o Google recebe só o hash SHA-256 (hex) desse nonce.
 */
export const GOOGLE_CLIENT_ID_PADRAO = "318097498976-n9tsh74pgmoehua22h6r6d3lu7aps2mq.apps.googleusercontent.com";

/** Liga o botão oficial e o One Tap. Sem o script do Google (bloqueado, offline), o botão antigo (redirecionamento) aparece. */
export const LOGIN_GIS_POR_PADRAO = true;

export const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

/** Espera máxima pelo script do Google antes de mostrar o botão antigo. */
export const GIS_TEMPO_LIMITE_MS = 4000;

/** Chave do `sessionStorage`: One Tap no máximo uma vez por sessão do navegador. */
export const ONE_TAP_CHAVE = "radioon_one_tap";

/** Atraso antes do One Tap (a pessoa vê a tela e o play primeiro). */
export const ONE_TAP_ATRASO_MS = 2500;

/**
 * Origens cadastradas no cliente "radioOn web" do Google (Authorized JavaScript origins). Em outra origem
 * (prévias da Vercel, CI, local) o Google recusa o botão, então nem carrega o script: fica o botão antigo.
 * Sobrescrita: `NEXT_PUBLIC_GOOGLE_ORIGENS` (lista separada por vírgula).
 */
export const GOOGLE_ORIGENS_PADRAO = ["https://radioon-ten.vercel.app"];

/** Cookie de teste (E2E): libera o GIS em qualquer origem (o teste troca o script do Google por um falso). */
export const COOKIE_TESTE_GIS = "radioon_teste_gis";

/** Token aceito pelo modo de teste (só fora de produção, com o cookie acima; não cria sessão). */
export const TOKEN_TESTE_GOOGLE = "teste.google.ok";

export function origemGoogleAutorizada(origem: string, valor = process.env.NEXT_PUBLIC_GOOGLE_ORIGENS): boolean {
  const lista = valor?.trim() ? valor.split(",").map((o) => o.trim().replace(/\/$/, "")) : GOOGLE_ORIGENS_PADRAO;
  return lista.includes(origem);
}

export function googleClientId(valor = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID): string {
  const v = valor?.trim();
  return v && /^[\w-]+\.apps\.googleusercontent\.com$/.test(v) ? v : GOOGLE_CLIENT_ID_PADRAO;
}

export function loginGisLigado(valor = process.env.NEXT_PUBLIC_LOGIN_GIS): boolean {
  if (valor === "1") return true;
  if (valor === "0") return false;
  return LOGIN_GIS_POR_PADRAO;
}

/** Nonce cru: 32 bytes aleatórios em hex. */
export function gerarNonce(aleatorio: (a: Uint8Array) => Uint8Array = (a) => crypto.getRandomValues(a)): string {
  return [...aleatorio(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 em hex (o que vai ao Google; o Supabase compara com o hash do nonce cru). */
export async function hashNonce(nonce: string): Promise<string> {
  const dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Formato aceito no servidor: JWT (três partes base64url) e nonce hex de 64 caracteres. */
export function parseCredencialGoogle(token: unknown, nonce: unknown): { token: string; nonce: string } | null {
  if (typeof token !== "string" || typeof nonce !== "string") return null;
  if (token.length > 4096 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null;
  if (!/^[0-9a-f]{64}$/.test(nonce)) return null;
  return { token, nonce };
}

/**
 * One Tap só para visitante sem conta, uma vez por sessão, e nunca com uma tela por cima
 * (player em tela cheia, stories ou o próprio painel de login são `<dialog>` abertos).
 */
export function podeMostrarOneTap(s: { conta: boolean | null; jaMostrado: boolean; dialogAberto: boolean; caminho: string }): boolean {
  if (s.conta !== false || s.jaMostrado || s.dialogAberto) return false;
  // Telas de login e páginas legais já têm o botão ou não combinam com um convite.
  return !/^\/(login|entrar|auth|termos|privacidade|onboarding)(\/|$)/.test(s.caminho);
}
