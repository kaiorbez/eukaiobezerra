"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { excluirLancamentoEVoltar } from "../actions";

export function ExcluirLancamento({ id, mes, descricao }: { id: string; mes: string; descricao: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-negativo"
      disabled={pendente}
      onClick={() => {
        if (confirm(`Excluir "${descricao}"?`)) iniciar(() => excluirLancamentoEVoltar(id, mes));
      }}
    >
      <Trash2 /> Excluir
    </Button>
  );
}
