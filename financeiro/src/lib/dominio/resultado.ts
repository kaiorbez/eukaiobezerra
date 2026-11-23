import { type Taxa, converter } from "./cambio";
import type { DataISO } from "./datas";
import { type Dinheiro, MOEDAS, type Moeda, dinheiro, somar, totaisPorMoeda, zero } from "./moeda";
import type { Ambito, LancamentoBase } from "./saldo";

/**
 * Resultado do mês: o único lugar (além do rateio) onde as duas moedas se somam.
 * Por isso a conversão usa sempre o câmbio de REFERÊNCIA, e o resultado carrega
 * a taxa e a data para que a tela diga qual taxa entrou na conta (PRD, seção 3).
 *
 * Operações de câmbio não entram aqui: trocar moeda não é receita nem despesa.
 */

export interface LancamentoComAmbito extends LancamentoBase {
  ambito: Ambito;
}

/** Totais nativos (sem conversão) e o equivalente em real à taxa de referência. */
export interface Composicao {
  nativo: Record<Moeda, Dinheiro>;
  emReais: Dinheiro;
}

export interface ResultadoDoMes {
  taxa: Taxa;
  receitas: Composicao;
  despesas: Composicao;
  /** receitas − despesas, em real, à taxa de referência */
  resultado: Dinheiro;
}

/** Soma por moeda e converte cada total para real uma única vez. */
function compor(valores: Dinheiro[], taxa: Taxa): Composicao {
  const nativo = totaisPorMoeda(valores);
  let emReais = zero("BRL");
  for (const m of MOEDAS) emReais = somar(emReais, converter(nativo[m], "BRL", taxa).valor);
  return { nativo, emReais };
}

export function noPeriodo(l: { data: DataISO }, de: DataISO, ate: DataISO): boolean {
  return l.data >= de && l.data <= ate;
}

/**
 * Receitas menos despesas dos lançamentos do período, pagos e previstos
 * (é a situação projetada do mês).
 */
export function resultadoDoMes(
  lancamentos: readonly LancamentoBase[],
  de: DataISO,
  ate: DataISO,
  taxaReferencia: Taxa,
): ResultadoDoMes {
  if (taxaReferencia.tipo !== "referencia") {
    throw new Error("O resultado do mês usa o câmbio de referência, nunca o efetivo.");
  }
  const doMes = lancamentos.filter((l) => noPeriodo(l, de, ate));
  const receitas = compor(doMes.filter((l) => l.tipo === "receita").map((l) => l.valor), taxaReferencia);
  const despesas = compor(doMes.filter((l) => l.tipo === "despesa").map((l) => l.valor), taxaReferencia);
  return {
    taxa: taxaReferencia,
    receitas,
    despesas,
    resultado: dinheiro(receitas.emReais.centavos - despesas.emReais.centavos, "BRL"),
  };
}

export interface Rateio {
  taxa: Taxa;
  /** percentual (0 a 100) do âmbito "casa" que vai para a empresa */
  percentualEmpresa: number;
  empresa: Dinheiro;
  pessoal: Dinheiro;
  /** o total de despesas — idêntico ao do resultado, qualquer que seja o percentual */
  total: Dinheiro;
}

/**
 * Divide as despesas do período entre empresa e pessoal.
 * Empresa = âmbito empresa + percentual da casa. Pessoal = o resto do total,
 * calculado por diferença: assim nenhum arredondamento faz o percentual mexer no total.
 */
export function rateioDoMes(
  lancamentos: readonly LancamentoComAmbito[],
  de: DataISO,
  ate: DataISO,
  taxaReferencia: Taxa,
  percentualEmpresa: number,
): Rateio {
  if (taxaReferencia.tipo !== "referencia") {
    throw new Error("O rateio usa o câmbio de referência, nunca o efetivo.");
  }
  if (!(percentualEmpresa >= 0 && percentualEmpresa <= 100)) {
    throw new RangeError("percentual do rateio fora de 0–100");
  }
  const despesas = lancamentos.filter((l) => l.tipo === "despesa" && noPeriodo(l, de, ate));
  const total = compor(despesas.map((l) => l.valor), taxaReferencia).emReais;

  // parte da empresa em cada moeda nativa, depois convertida uma vez
  const parte: Record<Moeda, number> = { BRL: 0, BOB: 0 };
  for (const l of despesas) {
    if (l.ambito === "empresa") parte[l.valor.moeda] += l.valor.centavos;
    else if (l.ambito === "casa") parte[l.valor.moeda] += (l.valor.centavos * percentualEmpresa) / 100;
  }
  let empresa = zero("BRL");
  for (const m of MOEDAS) {
    const c = Math.round(parte[m]);
    empresa = somar(empresa, converter(dinheiro(c, m), "BRL", taxaReferencia).valor);
  }
  return {
    taxa: taxaReferencia,
    percentualEmpresa,
    empresa,
    pessoal: dinheiro(total.centavos - empresa.centavos, "BRL"),
    total,
  };
}
