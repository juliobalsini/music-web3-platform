// Service worker do radioOn: torna o app instalável e recebe áudio compartilhado (Web Share Target).
// Não faz cache de páginas nem de áudio (a cota do B2 e a frescura da Rádio vêm primeiro).
const CACHE_COMPARTILHADO = "radioon-share-v1";
const CHAVE = "/__compartilhado";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname === "/compartilhar") {
    event.respondWith(
      (async () => {
        try {
          const form = await req.formData();
          const arquivo = form.get("arquivo");
          if (arquivo && typeof arquivo !== "string" && arquivo.size > 0) {
            const cache = await caches.open(CACHE_COMPARTILHADO);
            await cache.put(
              CHAVE,
              new Response(arquivo, {
                headers: {
                  "Content-Type": arquivo.type || "application/octet-stream",
                  "X-Nome": encodeURIComponent(arquivo.name || "faixa"),
                  "X-Titulo": encodeURIComponent(String(form.get("titulo") || "")),
                },
              }),
            );
            return Response.redirect("/enviar?compartilhado=1", 303);
          }
        } catch {
          /* cai no aviso */
        }
        return Response.redirect("/enviar?compartilhado=0", 303);
      })(),
    );
  }
  // Demais requisições seguem direto para a rede (sem respondWith).
});
