"use client";

import { Check, Clock, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { alternarStatus, excluirLancamento } from "./actions";

export function AcoesLinha({ id, status, descricao }: { id: string; status: "pago" | "previsto"; descricao: string }) {
  const [pendente, iniciar] = useTransition();
  const botao =
    "grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40";

  return (
    <div className="flex justify-end gap-0.5">
      <button
        type="button"
        className={botao}
        disabled={pendente}
        title={status === "pago" ? "Voltar para previsto" : "Marcar como pago"}
        onClick={() => iniciar(() => alternarStatus(id, status === "pago" ? "previsto" : "pago"))}
      >
        {status === "pago" ? <Clock className="size-4" /> : <Check className="size-4" />}
      </button>
      <Link href={`/lancamentos/${id}`} className={botao} title="Editar">
        <Pencil className="size-4" />
      </Link>
      <button
        type="button"
        className={`${botao} hover:text-negativo`}
        disabled={pendente}
        title="Excluir"
        onClick={() => {
          if (confirm(`Excluir "${descricao}"?`)) iniciar(() => excluirLancamento(id));
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
