"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Campo, Input, Select } from "@/components/ui/input";
import type { EstadoForm } from "@/lib/acoes/erros";
import { type Moeda, NOME_MOEDA, SIMBOLO } from "@/lib/dominio";
import { cn } from "@/lib/utils";
import { salvarLancamento } from "./actions";

export interface ValoresLancamento {
  tipo: "receita" | "despesa";
  data: string;
  descricao: string;
  valor: string;
  contaId: string;
  categoriaId: string;
  ambito: "empresa" | "pessoal" | "casa";
  status: "previsto" | "pago";
  venceEm: string;
}

interface Props {
  id: string | null;
  inicial: ValoresLancamento;
  contas: { id: string; nome: string; moeda: Moeda }[];
  categorias: { id: string; nome: string; grupo: string }[];
}

export function FormularioLancamento({ id, inicial, contas, categorias }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(
    salvarLancamento.bind(null, id),
    {},
  );
  const [tipo, setTipo] = useState(inicial.tipo);
  const [contaId, setContaId] = useState(inicial.contaId);
  const [status, setStatus] = useState(inicial.status);
  const moeda = contas.find((c) => c.id === contaId)?.moeda;
  const e = estado.erros ?? {};

  const grupos = Object.groupBy(categorias, (c) => c.grupo);

  return (
    <form action={acao} className="grid gap-5">
      {/* tipo */}
      <fieldset className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <legend className="sr-only">Tipo</legend>
        {(["despesa", "receita"] as const).map((t) => (
          <label
            key={t}
            className={cn(
              "cursor-pointer rounded-md py-1.5 text-center text-sm font-medium text-muted-foreground transition-colors",
              tipo === t && (t === "despesa" ? "bg-card text-negativo shadow" : "bg-card text-positivo shadow"),
            )}
          >
            <input
              type="radio"
              name="tipo"
              value={t}
              checked={tipo === t}
              onChange={() => setTipo(t)}
              className="sr-only"
            />
            {t === "despesa" ? "Despesa" : "Receita"}
          </label>
        ))}
      </fieldset>

      {/* caminho rápido: descrição, valor, conta */}
      <Campo rotulo="Descrição" htmlFor="descricao" erro={e.descricao}>
        <Input
          id="descricao"
          name="descricao"
          defaultValue={inicial.descricao}
          placeholder="Ex.: Yango, aluguel, cliente X"
          autoFocus={!id}
          required
          maxLength={200}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Conta"
          htmlFor="conta_id"
          erro={e.conta_id}
          dica={moeda ? `Moeda: ${NOME_MOEDA[moeda]} (${moeda}) — vem da conta` : "A moeda vem da conta escolhida"}
        >
          <Select
            id="conta_id"
            name="conta_id"
            value={contaId}
            onChange={(ev) => setContaId(ev.target.value)}
            required
          >
            <option value="" disabled>
              Escolha…
            </option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {c.moeda}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Valor" htmlFor="valor" erro={e.valor}>
          <div className="relative">
            <span
              className={cn(
                "pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium",
                moeda === "BRL" && "text-brl",
                moeda === "BOB" && "text-bob",
                !moeda && "text-muted-foreground",
              )}
            >
              {moeda ? SIMBOLO[moeda] : "—"}
            </span>
            <Input
              id="valor"
              name="valor"
              inputMode="decimal"
              defaultValue={inicial.valor}
              placeholder="0,00"
              className="num pl-10 text-right"
              required
            />
          </div>
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data" htmlFor="data" erro={e.data}>
          <Input id="data" name="data" type="date" defaultValue={inicial.data} required />
        </Campo>
        <Campo rotulo="Categoria" htmlFor="categoria_id" erro={e.categoria_id}>
          <Select id="categoria_id" name="categoria_id" defaultValue={inicial.categoriaId}>
            <option value="">Sem categoria</option>
            {Object.entries(grupos).map(([grupo, itens]) => (
              <optgroup key={grupo} label={grupo}>
                {itens?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Âmbito"
          htmlFor="ambito"
          erro={e.ambito}
          dica="Casa é rateada entre empresa e pessoal"
        >
          <Select id="ambito" name="ambito" defaultValue={inicial.ambito}>
            <option value="pessoal">Pessoal</option>
            <option value="empresa">Empresa</option>
            <option value="casa">Casa (rateio)</option>
          </Select>
        </Campo>
        <Campo rotulo="Status" htmlFor="status" erro={e.status}>
          <Select
            id="status"
            name="status"
            value={status}
            onChange={(ev) => setStatus(ev.target.value as "pago" | "previsto")}
          >
            <option value="pago">{tipo === "receita" ? "Recebido" : "Pago"}</option>
            <option value="previsto">Previsto</option>
          </Select>
        </Campo>
        <Campo rotulo="Vencimento" htmlFor="vence_em" erro={e.vence_em} dica="Opcional">
          <Input id="vence_em" name="vence_em" type="date" defaultValue={inicial.venceEm} />
        </Campo>
      </div>

      {estado.erro && <p className="text-sm text-negativo">{estado.erro}</p>}

      <div className="flex justify-end gap-2">
        <Link href="/lancamentos" className={buttonVariants({ variant: "ghost" })}>
          Cancelar
        </Link>
        <Button type="submit" disabled={pendente || contas.length === 0}>
          {pendente ? "Salvando…" : id ? "Salvar alterações" : "Incluir lançamento"}
        </Button>
      </div>
    </form>
  );
}
