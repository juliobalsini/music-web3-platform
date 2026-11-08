// Cache de URLs assinadas no cliente: uma por faixa, reusada até ~5 min antes de expirar.
export const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export type SignedUrl = { url: string; expiresAt: number };

export function isFresh(entry: SignedUrl | undefined, now = Date.now()): entry is SignedUrl {
  return !!entry && entry.expiresAt - REFRESH_MARGIN_MS > now;
}

export function createUrlCache(
  fetchUrl: (trackId: string) => Promise<SignedUrl>,
  now: () => number = Date.now,
) {
  const entries = new Map<string, SignedUrl>();
  return {
    async get(trackId: string, force = false): Promise<string> {
      const hit = entries.get(trackId);
      if (!force && isFresh(hit, now())) return hit.url;
      const novo = await fetchUrl(trackId);
      entries.set(trackId, novo);
      return novo.url;
    },
  };
}
