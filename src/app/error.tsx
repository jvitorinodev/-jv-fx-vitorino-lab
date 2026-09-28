"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("JV FX application error", error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center p-6">
      <ErrorState
        description="Ocorreu uma falha inesperada. Tente recarregar esta área. Se o problema persistir em produção, consulte os logs do servidor e da plataforma."
        action={<button onClick={reset} className="action"><RefreshCw className="size-3.5" />Tentar novamente</button>}
      />
    </main>
  );
}
