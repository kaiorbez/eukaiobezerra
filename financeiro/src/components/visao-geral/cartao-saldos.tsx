"use client";

import Link from "next/link";
import { useState } from "react";
import { Valor } from "@/components/valor";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOEDAS, NOME_MOEDA, dinheiro } from "@/lib/dominio";
import { cn } from "@/lib/utils";
import type { ContaResumo } from "./tipos";

export function Marcador({
  marcado,
  onChange,
  rotulo,
}: {
  marcado: boolean;
  onChange: (v: boolean) => void;
  rotulo: string;
}) {
  return (
    <input
      type="checkbox"
      checked={marcado}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={rotulo}
      className="size-4 shrink-0 cursor-pointer accent-[var(--primary)]"
    />
  );
}

export function useSelecao(ids: string[]) {
  const [fora, setFora] = useState<Set<string>>(new Set());
  return {
    marcada: (id: string) => !fora.has(id),
    alternar: (id: string, v: boolean) =>
      setFora((s) => {
        const n = new Set(s);
        if (v) n.delete(id);
        else n.add(id);
        return n;
      }),
    todas: fora.size === 0,
    alternarTodas: (v: boolean) => setFora(v ? new Set() : new Set(ids)),
  };
}

/** Saldos de caixa: uma linha por conta, cada uma na sua moeda; total POR MOEDA. */
export function CartaoSaldos({ contas, rotuloFim }: { contas: ContaResumo[]; rotuloFim: string }) {
  const sel = useSelecao(contas.map((c) => c.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldos de caixa</CardTitle>
      </CardHeader>
      {contas.length === 0 ? (
        <CardContent className="grid justify-items-center gap-3 py-6 text-center text-sm text-muted-foreground">
          <p>Nenhuma conta. Saldos aparecem aqui, cada um na moeda da sua conta.</p>
          <Link href="/contas" className={buttonVariants({ size: "sm" })}>
            Criar conta
          </Link>
        </CardContent>
      ) : (
        <div className="pb-2 text-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 px-5 pb-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <Marcador marcado={sel.todas} onChange={sel.alternarTodas} rotulo="Marcar todas as contas" />
              Conta
            </label>
            <span className="text-right">Confirmado</span>
            <span className="text-right">{rotuloFim}</span>
          </div>
          {contas.map((c) => (
            <div
              key={c.id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-t px-5 py-2",
                !sel.marcada(c.id) && "opacity-45",
              )}
            >
              <label className="flex min-w-0 items-center gap-2">
                <Marcador marcado={sel.marcada(c.id)} onChange={(v) => sel.alternar(c.id, v)} rotulo={c.nome} />
                <span className="min-w-0 break-words">{c.nome}</span>
              </label>
              <Valor v={dinheiro(c.confirmado, c.moeda)} className="text-right" />
              <Valor v={dinheiro(c.noFim, c.moeda)} className="text-right" />
            </div>
          ))}
          {MOEDAS.filter((m) => contas.some((c) => c.moeda === m)).map((m) => {
            const marcadas = contas.filter((c) => c.moeda === m && sel.marcada(c.id));
            const soma = (k: "confirmado" | "noFim") => marcadas.reduce((a, c) => a + c[k], 0);
            return (
              <div
                key={m}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-t px-5 py-2 font-semibold"
              >
                <span>Total em {NOME_MOEDA[m].toLowerCase()}</span>
                <Valor v={dinheiro(soma("confirmado"), m)} className="text-right" />
                <Valor v={dinheiro(soma("noFim"), m)} className="text-right" />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
