// Lógica pura do proxy (testável em Node, sem APIs do Workers).

export const LIMITE_ALERTA = 0.8;

export function caminhoPermitido(path, prefixos) {
  if (!path || path.length > 512 || path.includes("..") || path.includes("//") || path.startsWith("/")) return false;
  if (path.endsWith("/")) return false; // nunca listagem
  return prefixos.some((p) => p && path.startsWith(p) && path.length > p.length);
}

export function origemPermitida(origin, lista, regex) {
  if (!origin) return null;
  if (lista.includes(origin)) return origin;
  try {
    if (regex && new RegExp(regex).test(origin)) return origin;
  } catch {
    /* regex inválida: só a lista vale */
  }
  return null;
}

/** Interpreta `Range: bytes=a-b` para um arquivo de `size` bytes. null = sem Range; "invalido" = 416. */
export function lerRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "invalido";
  let ini;
  let fim;
  if (m[1] === "") {
    const n = Number(m[2]);
    if (n === 0) return "invalido";
    ini = Math.max(0, size - n);
    fim = size - 1;
  } else {
    ini = Number(m[1]);
    fim = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (ini >= size || ini > fim) return "invalido";
  return { ini, fim };
}

/** Cota diária do KV (plano gratuito): a partir de 80% de escritas ou leituras, serve direto do B2. */
export function kvEmRisco(ctl, cfg) {
  return ctl.escritas >= cfg.escritasDia * LIMITE_ALERTA || ctl.leituras >= cfg.leiturasDia * LIMITE_ALERTA;
}

export function podeGravar(tamanho, ctl, cfg) {
  return tamanho <= cfg.maxItem && ctl.bytes + tamanho <= cfg.maxTotal && !kvEmRisco(ctl, cfg);
}

export const CACHE_CONTROL = "public, max-age=31536000, immutable";
