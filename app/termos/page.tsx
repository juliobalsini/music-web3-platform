import { Tela } from "@/components/ui";

export const metadata = {
  title: "Termos de uso · radioOn",
  description: "Regras de uso do radioOn para ouvintes, artistas e curadores.",
};

const h2 = "mt-4 text-lg font-bold";
const p = "text-white/80 text-pretty";

export default function TermosPage() {
  return (
    <Tela>
      <h1 className="text-2xl font-semibold text-balance">Termos de Uso</h1>
      <p className="text-sm text-white/70">Atualizados em 11/11/2026</p>

      <h2 className={h2}>O serviço</h2>
      <p className={p}>O radioOn permite ouvir música independente, enviar faixas (artistas), montar playlists (curadores) e ganhar pontos por escutas válidas. Ouvir não exige conta; enviar música, criar playlist e resgatar recompensas exigem entrar com e-mail ou Google.</p>

      <h2 className={h2}>Pontos</h2>
      <p className={p}>Pontos são ganhos por escutas válidas (30 segundos contínuos, com limites por faixa e por dia, e teto menor para visitantes sem conta). Não têm valor em dinheiro, não são transferíveis e podem ser ajustados ou cancelados em caso de fraude, uso de robôs ou abuso. As regras de pontos podem mudar.</p>

      <h2 className={h2}>Artistas e direitos autorais</h2>
      <p className={p}>Ao enviar uma faixa, você declara ter todos os direitos sobre ela (composição, gravação e samples) e autoriza o radioOn a armazená-la e transmiti-la na plataforma. Você continua dono da obra e pode pedir a remoção quando quiser. Conteúdo que viole direitos de terceiros será removido.</p>

      <h2 className={h2}>Condutas proibidas</h2>
      <p className={p}>Burlar limites ou a contagem de escutas, criar sessões em massa, atacar ou sobrecarregar o serviço, enviar conteúdo ilegal, ofensivo ou que não seja seu, e se passar por outra pessoa.</p>

      <h2 className={h2}>Conta e encerramento</h2>
      <p className={p}>Você pode pedir a exclusão da conta a qualquer momento (veja a Política de Privacidade). Podemos suspender contas que descumpram estes termos.</p>

      <h2 className={h2}>Responsabilidade</h2>
      <p className={p}>O serviço é oferecido como está, em fase inicial, sem garantia de disponibilidade contínua. Não nos responsabilizamos por conteúdo enviado por usuários, mas removeremos o que for denunciado e irregular.</p>

      <h2 className={h2}>Lei aplicável e contato</h2>
      <p className={p}>Lei brasileira, foro do domicílio do consumidor. Contato: <a className="underline underline-offset-4" href="mailto:juliobalsini@gmail.com">juliobalsini@gmail.com</a>. Veja também a <a className="underline underline-offset-4" href="/privacidade">Política de Privacidade</a>.</p>
    </Tela>
  );
}
