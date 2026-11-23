import type { DataISO } from "./datas";
import { type Dinheiro, type Moeda, dinheiro, somar } from "./moeda";

/**
 * Saldos de conta. Camada pura: recebe lançamentos e câmbios, devolve números.
 * Cada conta fecha na sua própria moeda — aqui não existe conversão.
 */

export type TipoLancamento = "receita" | "despesa";
export type StatusLancamento = "previsto" | "pago";
export type Ambito = "empresa" | "pessoal" | "casa";

export interface ContaBase {
  id: string;
  moeda: Moeda;
  saldoInicial: Dinheiro;
}

export interface LancamentoBase {
  contaId: string;
  data: DataISO;
  valor: Dinheiro; // sempre positivo; o sinal vem do tipo
  tipo: TipoLancamento;
  status: StatusLancamento;
}

export interface CambioBase {
  data: DataISO;
  contaOrigemId: string;
  valorOrigem: Dinheiro;
  contaDestinoId: string;
  valorDestino: Dinheiro;
}

/** Efeito de um lançamento no saldo: receita soma, despesa subtrai. */
export function efeito(l: LancamentoBase): Dinheiro {
  return dinheiro(l.tipo === "receita" ? l.valor.centavos : -l.valor.centavos, l.valor.moeda);
}

export interface Saldos {
  /** Saldo inicial + o que já está pago até a data de referência. */
  confirmado: Dinheiro;
  /** Confirmado + tudo previsto até o fim do período (inclusive o previsto atrasado). */
  noFim: Dinheiro;
}

/**
 * Saldo de uma conta.
 *  - `ate`: o dia que vale como "hoje" para o confirmado.
 *  - `fim`: o último dia do período para "no fim do mês".
 * Um câmbio é sempre um movimento realizado: conta no confirmado a partir da sua data.
 */
export function saldoDaConta(
  conta: ContaBase,
  lancamentos: readonly LancamentoBase[],
  cambios: readonly CambioBase[],
  ate: DataISO,
  fim: DataISO = ate,
): Saldos {
  let confirmado = conta.saldoInicial;
  let noFim = conta.saldoInicial;

  for (const l of lancamentos) {
    if (l.contaId !== conta.id) continue;
    const e = efeito(l); // lança erro se a moeda não for a da conta
    if (l.status === "pago") {
      if (l.data <= ate) confirmado = somar(confirmado, e);
      if (l.data <= fim) noFim = somar(noFim, e);
    } else if (l.data <= fim) {
      noFim = somar(noFim, e);
    }
  }

  for (const c of cambios) {
    let e: Dinheiro | null = null;
    if (c.contaOrigemId === conta.id) e = dinheiro(-c.valorOrigem.centavos, c.valorOrigem.moeda);
    else if (c.contaDestinoId === conta.id) e = c.valorDestino;
    if (!e) continue;
    if (c.data <= ate) confirmado = somar(confirmado, e);
    if (c.data <= fim) noFim = somar(noFim, e);
  }

  return { confirmado, noFim };
}

/** Contas a pagar ou a receber: o que está previsto até o fim do período e ainda não foi pago. */
export function pendentes<T extends LancamentoBase>(
  lancamentos: readonly T[],
  tipo: TipoLancamento,
  fim: DataISO,
): T[] {
  return lancamentos
    .filter((l) => l.tipo === tipo && l.status === "previsto" && l.data <= fim)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}
