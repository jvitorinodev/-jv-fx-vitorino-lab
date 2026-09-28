"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("JV FX dashboard error", error);
  }, [error]);

  return (
    <div className="py-8">
      <ErrorState
        title="Falha ao carregar o módulo"
        description="A navegação continua disponível. Tente carregar o módulo novamente; nenhum dado deve ser considerado salvo até a confirmação visual da operação."
        action={<button onClick={reset} className="action"><RefreshCw className="size-3.5" />Recarregar módulo</button>}
      />
    </div>
  );
}
