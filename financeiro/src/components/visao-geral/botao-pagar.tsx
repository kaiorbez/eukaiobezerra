"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { alternarStatus } from "@/app/(app)/lancamentos/actions";

export function BotaoPagar({ id, tipo }: { id: string; tipo: "receita" | "despesa" }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciar(() => alternarStatus(id, "pago"))}
      title={tipo === "despesa" ? "Marcar como pago" : "Marcar como recebido"}
      className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-positivo disabled:opacity-40"
    >
      <Check className="size-4" />
    </button>
  );
}
