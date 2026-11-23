import { type DataISO, ultimoDia } from "./datas";
import type { Moeda } from "./moeda";
import { type CambioBase, type ContaBase, type LancamentoBase, saldoDaConta } from "./saldo";

/**
 * Fluxo de caixa: o saldo de cada conta dia a dia, na moeda da conta.
 * A tela desenha um gráfico por moeda; aqui nada é somado entre moedas.
 */

export interface PontoFluxo {
  data: DataISO;
  centavos: number;
}

function proximoDia(d: DataISO): DataISO {
  const [a, m, dia] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, dia + 1));
  return dt.toISOString().slice(0, 10);
}

/** Os dias do gráfico: de hoje (ou do dia 1, se o mês já passou ou ainda vai começar) até o fim do mês. */
export function diasDoFluxo(mes: string, hoje: DataISO): DataISO[] {
  const inicio = `${mes}-01`;
  const fim = ultimoDia(mes);
  let d = hoje >= inicio && hoje <= fim ? hoje : inicio;
  const dias: DataISO[] = [];
  while (d <= fim) {
    dias.push(d);
    d = proximoDia(d);
  }
  return dias;
}

/**
 * Saldo projetado de uma conta em cada dia: o confirmado até hoje
 * mais tudo o que está lançado (pago ou previsto) até aquele dia.
 */
export function fluxoDaConta(
  conta: ContaBase,
  lancamentos: readonly LancamentoBase[],
  cambios: readonly CambioBase[],
  dias: readonly DataISO[],
  hoje: DataISO,
): PontoFluxo[] {
  return dias.map((d) => ({
    data: d,
    centavos: saldoDaConta(conta, lancamentos, cambios, d < hoje ? d : hoje, d).noFim.centavos,
  }));
}

/** Soma ponto a ponto as séries de contas DA MESMA moeda. */
export function somarSeries(moeda: Moeda, series: { moeda: Moeda; pontos: PontoFluxo[] }[]): PontoFluxo[] {
  const daMoeda = series.filter((s) => s.moeda === moeda);
  if (daMoeda.length === 0) return [];
  return daMoeda[0].pontos.map((p, i) => ({
    data: p.data,
    centavos: daMoeda.reduce((acc, s) => acc + s.pontos[i].centavos, 0),
  }));
}
