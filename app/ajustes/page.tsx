import { AjusteNormalizar } from "@/components/ajuste-normalizar";
import { Tela } from "@/components/ui";

export const metadata = { title: "Ajustes · radioOn" };

export default function AjustesPage() {
  return (
    <Tela>
      <h1 className="text-2xl font-semibold text-balance">Ajustes</h1>
      <AjusteNormalizar />
    </Tela>
  );
}
