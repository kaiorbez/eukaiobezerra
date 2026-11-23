"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ehMesISO, hoje, mesDe, rotuloMesCurto, somarMeses } from "@/lib/dominio";
import { cn } from "@/lib/utils";

/** Navegador de mês: lê e grava `?mes=YYYY-MM`, preservando os outros filtros. */
export function NavegadorMes({ vertical = false }: { vertical?: boolean }) {
  const params = useSearchParams();
  const atual = mesDe(hoje());
  const p = params.get("mes");
  const mes = p && ehMesISO(p) ? p : atual;

  const para = (m: string) => {
    const q = new URLSearchParams(params);
    if (m === atual) q.delete("mes");
    else q.set("mes", m);
    const s = q.toString();
    return `/lancamentos${s ? `?${s}` : ""}`;
  };
  // de qualquer tela, trocar o mês leva para os lançamentos daquele mês
  const destino = para;

  return (
    <div className={cn("flex items-center gap-1", vertical && "flex-col")}>
      <Link
        href={destino(somarMeses(mes, -1))}
        aria-label="Mês anterior"
        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className={cn("size-4", vertical && "rotate-90")} />
      </Link>
      <Link
        href={destino(atual)}
        title="Voltar para o mês atual"
        className={cn(
          "rounded-md px-1.5 py-1 text-center text-sm font-medium whitespace-nowrap hover:bg-muted",
          mes !== atual && "text-aviso",
        )}
      >
        {rotuloMesCurto(mes)}
      </Link>
      <Link
        href={destino(somarMeses(mes, 1))}
        aria-label="Mês seguinte"
        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className={cn("size-4", vertical && "rotate-90")} />
      </Link>
    </div>
  );
}
