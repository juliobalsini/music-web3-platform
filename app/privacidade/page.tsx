import { Tela } from "@/components/ui";

export const metadata = {
  title: "Privacidade · radioOn",
  description: "Quais dados a radioOn coleta, para quê, por quanto tempo e como pedir a exclusão.",
};

const h2 = "mt-4 text-lg font-bold";
const p = "text-white/80 text-pretty";

export default function PrivacidadePage() {
  return (
    <Tela>
      <h1 className="text-2xl font-semibold text-balance">Política de Privacidade</h1>
      <p className="text-sm text-white/70">Atualizada em 11/11/2026 · Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018)</p>

      <h2 className={h2}>Quem somos</h2>
      <p className={p}>A radioOn é uma plataforma independente de streaming de música. O controlador dos dados é o responsável pelo projeto, contato: <a className="underline underline-offset-4" href="mailto:juliobalsini@gmail.com">juliobalsini@gmail.com</a>.</p>

      <h2 className={h2}>Dados que coletamos</h2>
      <ul className="list-disc space-y-1 pl-5 text-white/80">
        <li><strong>Visitante:</strong> ao dar play, criamos uma sessão anônima (um identificador aleatório, sem nome nem e-mail) para registrar escutas e pontos.</li>
        <li><strong>Conta:</strong> e-mail e, se você entrar com Google, nome e foto públicos da conta Google. Nome de exibição e perfil (ouvinte, artista ou curador) que você escolher.</li>
        <li><strong>Uso:</strong> faixas ouvidas, tempo de escuta, pontos, curtidas, salvos e playlists.</li>
        <li><strong>Conteúdo enviado:</strong> áudio, capa e informações das faixas que artistas publicam.</li>
        <li><strong>Técnicos:</strong> cookies de sessão necessários para manter você conectado. Não usamos cookies de publicidade nem vendemos dados.</li>
      </ul>

      <h2 className={h2}>Para que usamos</h2>
      <p className={p}>Tocar música, validar escutas e conceder pontos, manter sua conta, mostrar rankings e métricas aos artistas (em números agregados), evitar fraude e abuso e cumprir obrigações legais. A base legal é a execução do serviço que você pediu, o legítimo interesse em segurança e o seu consentimento quando aplicável.</p>

      <h2 className={h2}>Com quem compartilhamos</h2>
      <p className={p}>Apenas com os provedores que operam o serviço: Supabase (banco de dados e autenticação), Vercel (hospedagem), Backblaze (armazenamento do áudio) e Google (se você escolher entrar com Google). Alguns estão fora do Brasil (por exemplo, nos EUA). Não vendemos nem cedemos seus dados a terceiros para publicidade.</p>

      <h2 className={h2}>Por quanto tempo guardamos</h2>
      <p className={p}>Enquanto sua conta existir. Ao excluir a conta, removemos ou anonimizamos seus dados pessoais, salvo o que a lei exigir guardar. Sessões anônimas sem uso por mais de 12 meses poderão ser apagadas.</p>

      <h2 className={h2}>Seus direitos e a exclusão da conta</h2>
      <p className={p}>Você pode pedir acesso, correção, portabilidade, informação sobre compartilhamento, revogação de consentimento e a <strong>exclusão da conta e dos dados</strong>. Escreva para <a className="underline underline-offset-4" href="mailto:juliobalsini@gmail.com">juliobalsini@gmail.com</a> a partir do e-mail da conta (para visitantes, descreva o aparelho e a data de uso). Respondemos em até 15 dias.</p>

      <h2 className={h2}>Segurança</h2>
      <p className={p}>Pontos e permissões são validados no servidor; o acesso ao banco usa regras por usuário; o áudio só é entregue por links temporários. Nenhum sistema é 100% seguro; em caso de incidente relevante, avisaremos você e a ANPD conforme a lei.</p>

      <h2 className={h2}>Alterações</h2>
      <p className={p}>Se esta política mudar, a data acima será atualizada. Dúvidas ou reclamações: <a className="underline underline-offset-4" href="mailto:juliobalsini@gmail.com">juliobalsini@gmail.com</a>.</p>
    </Tela>
  );
}
