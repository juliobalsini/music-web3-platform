import { UploadForm } from "@/components/upload-form";

export const metadata = { title: "Enviar faixa · radioOn" };

export default function EnviarPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Enviar faixa</h1>
      <UploadForm />
    </main>
  );
}
