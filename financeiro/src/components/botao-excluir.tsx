"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

/** Exclui com confirmação e mostra o motivo quando o banco recusa. */
export function BotaoExcluir({
  rotulo,
  acao,
}: {
  rotulo: string;
  acao: () => Promise<{ erro?: string }>;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <span className="inline-flex items-center gap-2">
      {erro && <span className="max-w-56 text-right text-xs text-negativo">{erro}</span>}
      <button
        type="button"
        title={`Excluir ${rotulo}`}
        disabled={pendente}
        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-negativo disabled:opacity-40"
        onClick={() => {
          if (!confirm(`Excluir ${rotulo}?`)) return;
          iniciar(async () => setErro((await acao()).erro));
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </span>
  );
}
