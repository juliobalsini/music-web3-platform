/** Textos de erro do envio de faixa (pt-BR, curtos: problema + saída). */

const LIMITE = "Limite diário de envios atingido. Tente amanhã.";

/** Resposta de erro da rota /api/tracks/upload. */
export function erroDaRotaDeUpload(status: number, erro?: unknown): string {
  if (status === 401) return "Sua sessão expirou. Entre de novo.";
  if (status === 403) return "Só artistas enviam faixas. Escolha o perfil Artista.";
  if (status === 503) return "Envio indisponível agora. Tente mais tarde.";
  if (status === 429) return LIMITE;
  const e = typeof erro === "string" ? erro : "";
  if (/formato/.test(e)) return "Formato não aceito. Use MP3, M4A, OGG ou FLAC.";
  if (/25 MB|vazio/.test(e)) return "Arquivo vazio ou maior que 25 MB.";
  if (/direitos/.test(e)) return "Confirme que você tem os direitos da faixa.";
  if (/título/.test(e)) return "Digite um título de até 200 caracteres.";
  return "Não foi possível enviar. Tente de novo.";
}

/** Falha do PUT direto ao bucket (B2): 403/429 = cota diária; resto = falha comum. */
export function erroDoBucket(status: number): string {
  if (status === 403 || status === 429 || status === 503) return LIMITE;
  return "O envio falhou. Tente de novo.";
}
