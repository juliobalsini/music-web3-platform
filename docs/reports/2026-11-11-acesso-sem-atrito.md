# Acesso sem atrito — 2026-11-11

## O que mudou
- **Ouvir sem entrar:** Rádio, Explorar, busca, perfis e player já eram públicos. Agora, ao dar play, o visitante ganha uma sessão anônima do Supabase e suas escutas/pontos são registrados.
- **Entrar vincula:** com e-mail (`updateUser`) ou Google (`linkIdentity`) o mesmo usuário vira conta, mantendo pontos e histórico. Se o e-mail já tem conta, o login normal substitui a sessão anônima (pontos anônimos não migram — o `points_ledger` é append-only).
- **Login só para** enviar música, criar playlist/escolher perfil e resgatar recompensas (visitante anônimo conta como "sem login" nessas telas). Minha rádio mostra o convite "Salvar meus pontos".
- **Abuso:** teto diário do anônimo `POINTS_ANON_DAILY_LIMIT` (padrão 50 vs 200 da conta), mais as regras existentes (30 s contínuos, 3x/faixa/dia). A sessão só é criada se a faixa existe e está publicada.
- **/privacidade e /termos** (LGPD: dados, finalidade, retenção, exclusão, contato juliobalsini@gmail.com), com links no rodapé de todas as telas e no login.
- Sem migration.

## O que você precisa ativar no Supabase (Authentication)
1. **Sign In / Providers → "Allow anonymous sign-ins": ligado.** Sem isso, visitantes ouvem normalmente, mas não pontuam.
2. **Sign In / Providers → "Allow manual linking": ligado** (necessário para vincular o Google à sessão anônima; o e-mail não precisa).
3. Recomendado: o e-mail "Change Email Address" também serve de link de acesso para quem vincula e-mail; confira o modelo em Email Templates.
4. Opcional: CAPTCHA (hCaptcha/Turnstile) para anônimos — não feito (exigiria credencial nova). O Supabase já limita criação de anônimos por IP.
5. Opcional na Vercel: `POINTS_ANON_DAILY_LIMIT`.

## Branding do Google OAuth (Google Auth Platform → Branding)
- **Página inicial do app:** https://radioon-ten.vercel.app
- **Link da política de privacidade:** https://radioon-ten.vercel.app/privacidade
- **Link dos termos de serviço:** https://radioon-ten.vercel.app/termos
- **Domínios autorizados:** `radioon-ten.vercel.app` (se o Google recusar subdomínio de `vercel.app`, é preciso domínio próprio) e `supabase.co` (domínio do callback do Supabase).
- **E-mail de suporte / contato do desenvolvedor:** juliobalsini@gmail.com
- Escopos: só `openid`, `email`, `profile` (não sensíveis) — permite publicar sem verificação.
- Depois: "Público" → "Publicar app".

## Limites
- Lógica de sessão anônima só validada por tipos/build (sem credencial de banco/painel); conferir uma escuta real como visitante e depois vincular.
- Limpeza de sessões anônimas antigas é manual (não há DELETE automático, pelas travas); a política diz "poderão ser apagadas".
