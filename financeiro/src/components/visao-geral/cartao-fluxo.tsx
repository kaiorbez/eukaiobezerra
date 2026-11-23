"use client";

import Link from "next/link";
import { Valor } from "@/components/valor";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOEDAS, NOME_MOEDA, SIMBOLO, dinheiro, somarSeries } from "@/lib/dominio";
import { cn } from "@/lib/utils";
import { Marcador, useSelecao } from "./cartao-saldos";
import { GraficoFluxo } from "./grafico-fluxo";
import type { ContaResumo } from "./tipos";

/** Fluxo de caixa: um gráfico por moeda, com escalas independentes. */
export function CartaoFluxo({ contas, rotuloFim }: { contas: ContaResumo[]; rotuloFim: string }) {
  const sel = useSelecao(contas.map((c) => c.id));
  const moedas = MOEDAS.filter((m) => contas.some((c) => c.moeda === m));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de caixa</CardTitle>
      </CardHeader>
      {contas.length === 0 ? (
        <CardContent className="grid justify-items-center gap-3 py-6 text-center text-sm text-muted-foreground">
          <p>O fluxo mostra o saldo de hoje até o fim do mês, um gráfico por moeda.</p>
          <Link href="/contas" className={buttonVariants({ size: "sm" })}>
            Criar conta
          </Link>
        </CardContent>
      ) : (
        <CardContent className="grid gap-5">
          {moedas.map((m) => {
            const daMoeda = contas.filter((c) => c.moeda === m);
            const marcadas = daMoeda.filter((c) => sel.marcada(c.id));
            const serie = somarSeries(
              m,
              marcadas.map((c) => ({ moeda: c.moeda, pontos: c.fluxo })),
            );
            return (
              <section key={m} className="grid gap-2">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <span className="h-0.5 w-4 rounded-full" style={{ background: `var(--${m.toLowerCase()})` }} />
                  {NOME_MOEDA[m]} ({SIMBOLO[m]})
                </h3>
                {marcadas.length > 0 ? (
                  <GraficoFluxo moeda={m} pontos={serie} />
                ) : (
                  <p className="grid h-40 place-items-center text-xs text-muted-foreground">
                    Nenhuma conta em {NOME_MOEDA[m].toLowerCase()} marcada.
                  </p>
                )}
                <div className="text-sm">
                  <div className="flex justify-end pb-1 text-xs text-muted-foreground">Saldo {rotuloFim.toLowerCase()}</div>
                  {daMoeda.map((c) => (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-center gap-2 border-t py-1.5",
                        !sel.marcada(c.id) && "opacity-45",
                      )}
                    >
                      <Marcador marcado={sel.marcada(c.id)} onChange={(v) => sel.alternar(c.id, v)} rotulo={c.nome} />
                      <span className="flex-1 truncate">{c.nome}</span>
                      <Valor v={dinheiro(c.noFim, m)} />
                    </label>
                  ))}
                  <div className="flex items-center border-t py-1.5 font-semibold">
                    <span className="flex-1">Total</span>
                    <Valor v={dinheiro(marcadas.reduce((a, c) => a + c.noFim, 0), m)} />
                  </div>
                </div>
              </section>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
