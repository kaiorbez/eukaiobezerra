"use client";

import { useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { marcasRedondas } from "@/lib/eixo";
import { type Moeda, dinheiro, formatar, formatarDataCurta } from "@/lib/dominio";

const COR: Record<Moeda, string> = { BRL: "var(--brl)", BOB: "var(--bob)" };
const semInscricao = () => () => {};


const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Uma linha, uma moeda, uma escala. Nunca dois eixos no mesmo gráfico. */
export function GraficoFluxo({ moeda, pontos }: { moeda: Moeda; pontos: { data: string; centavos: number }[] }) {
  // o Recharts mede o contêiner no navegador; no servidor fica só o espaço reservado
  const montado = useSyncExternalStore(semInscricao, () => true, () => false);

  const dados = pontos.map((p) => ({ data: p.data, valor: p.centavos / 100, centavos: p.centavos }));
  const cruzaZero = dados.some((d) => d.valor < 0);
  const marcas = marcasRedondas(Math.min(...dados.map((d) => d.valor)), Math.max(...dados.map((d) => d.valor)));

  if (!montado) return <div className="h-40" />;

  return (
    <div className="h-40" role="img" aria-label={`Saldo previsto em ${moeda} dia a dia; valores do eixo em ${moeda}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
          <XAxis
            dataKey="data"
            tickFormatter={formatarDataCurta}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            // escala própria desta moeda, sempre incluindo o zero, com marcas redondas
            domain={[marcas[0], marcas[marcas.length - 1]]}
            ticks={marcas}
            interval={0}
            tickFormatter={(v: number) => compacto.format(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          {cruzaZero && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />}
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { data: string; centavos: number } | undefined;
              if (!active || !p) return null;
              return (
                <div className="rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-lg">
                  <p className="text-muted-foreground">{formatarDataCurta(p.data)}</p>
                  <p className="num font-semibold">{formatar(dinheiro(p.centavos, moeda))}</p>
                </div>
              );
            }}
          />
          <Line
            type="stepAfter"
            dataKey="valor"
            stroke={COR[moeda]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2, fill: COR[moeda] }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
