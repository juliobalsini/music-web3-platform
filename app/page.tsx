import { Play } from "lucide-react";

import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <Logo className="text-5xl sm:text-7xl" />

      <div
        aria-hidden="true"
        className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 shadow-[0_0_60px_-10px_#ff6b35]"
      >
        <Play className="ml-1 size-12 fill-white text-white" strokeWidth={0} />
      </div>

      <p className="text-lg text-white/70">
        <span className="sr-only">radioOn — </span>em construção
      </p>
    </main>
  );
}
