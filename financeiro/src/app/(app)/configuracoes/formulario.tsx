"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import type { EstadoForm } from "@/lib/acoes/erros";
import { salvarConfig } from "./actions";

export function FormularioConfig({
  inicial,
}: {
  inicial: { cambioReferencia: string; cambioReferenciaData: string; rateio: string };
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarConfig, {});
  const e = estado.erros ?? {};
  return (
    <form action={acao} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Câmbio de referência (Bs por R$)"
          htmlFor="cambio_referencia"
          erro={e.cambio_referencia}
          dica="Usado só para comparar: resultado do mês, rateio e gráficos de composição."
        >
          <Input
            id="cambio_referencia"
            name="cambio_referencia"
            inputMode="decimal"
            defaultValue={inicial.cambioReferencia}
            className="num"
            required
          />
        </Campo>
        <Campo
          rotulo="Vale desde"
          htmlFor="cambio_referencia_data"
          erro={e.cambio_referencia_data}
          dica="A data aparece junto da taxa em toda tela que converte."
        >
          <Input
            id="cambio_referencia_data"
            name="cambio_referencia_data"
            type="date"
            defaultValue={inicial.cambioReferenciaData}
            required
          />
        </Campo>
      </div>
      <Campo
        rotulo="Rateio do escritório (% da casa que é da empresa)"
        htmlFor="rateio_escritorio"
        erro={e.rateio_escritorio}
        dica="Aplica-se aos lançamentos com âmbito Casa. É uma estimativa: vale confirmar com o contador."
        className="sm:max-w-xs"
      >
        <div className="relative">
          <Input
            id="rateio_escritorio"
            name="rateio_escritorio"
            inputMode="decimal"
            defaultValue={inicial.rateio}
            className="num pr-8"
            required
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            %
          </span>
        </div>
      </Campo>
      {estado.erro && <p className="text-sm text-negativo">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-positivo">Salvo. Nenhum saldo de conta muda com estes parâmetros.</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
