"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Campo, Input, Select } from "@/components/ui/input";
import type { EstadoForm } from "@/lib/acoes/erros";
import { salvarConta } from "./actions";

interface Props {
  id: string | null;
  inicial?: { nome: string; moeda: string; tipo: string; saldoInicial: string };
  moedaTravada?: boolean;
}

export function FormularioConta({ id, inicial, moedaTravada }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarConta.bind(null, id), {});
  const ref = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  useEffect(() => {
    if (estado.ok && !id) ref.current?.reset();
  }, [estado, id]);

  return (
    <form ref={ref} action={acao} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome" htmlFor="nome" erro={e.nome} className="sm:col-span-2">
        <Input id="nome" name="nome" defaultValue={inicial?.nome} placeholder="Ex.: Santander, Efectivo Bs" required />
      </Campo>
      <Campo
        rotulo="Moeda"
        htmlFor="moeda"
        erro={e.moeda}
        dica={moedaTravada ? "A conta já tem movimentos: a moeda não muda mais." : "Toda conta tem exatamente uma moeda."}
      >
        {moedaTravada && <input type="hidden" name="moeda" value={inicial?.moeda} />}
        <Select id="moeda" name="moeda" defaultValue={inicial?.moeda ?? ""} disabled={moedaTravada} required>
          <option value="" disabled>
            Escolha…
          </option>
          <option value="BRL">Real (R$)</option>
          <option value="BOB">Boliviano (Bs)</option>
        </Select>
      </Campo>
      <Campo rotulo="Tipo" htmlFor="tipo" erro={e.tipo}>
        <Select id="tipo" name="tipo" defaultValue={inicial?.tipo ?? "banco"}>
          <option value="banco">Banco</option>
          <option value="dinheiro">Dinheiro</option>
        </Select>
      </Campo>
      <Campo
        rotulo="Saldo inicial"
        htmlFor="saldo_inicial"
        erro={e.saldo_inicial}
        dica="Na moeda da conta. Pode ser negativo."
        className="sm:col-span-2"
      >
        <Input
          id="saldo_inicial"
          name="saldo_inicial"
          inputMode="decimal"
          defaultValue={inicial?.saldoInicial ?? ""}
          placeholder="0,00"
          className="num"
        />
      </Campo>
      {estado.erro && <p className="text-sm text-negativo sm:col-span-2">{estado.erro}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        {id && (
          <Link href="/contas" className={buttonVariants({ variant: "ghost" })}>
            Cancelar
          </Link>
        )}
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : id ? "Salvar" : "Criar conta"}
        </Button>
      </div>
    </form>
  );
}
