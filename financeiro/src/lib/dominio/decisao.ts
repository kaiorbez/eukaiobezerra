import { type Taxa, taxaEfetiva } from "./cambio";
import { type Dinheiro, dinheiro } from "./moeda";
import type { CambioBase } from "./saldo";

/**
 * Fase 3 · Câmbio. A única ponte entre as duas moedas.
 * Aqui a taxa é SEMPRE a efetiva — a que foi (ou será) paga de verdade.
 */

/** A taxa efetiva da troca mais recente (por data; empate fica com a primeira da lista). */
export function ultimaTaxaEfetiva(cambios: readonly CambioBase[]): Taxa | null {
  let ultimo: CambioBase | null = null;
  for (const c of cambios) if (!ultimo || c.data > ultimo.data) ultimo = c;
  if (!ultimo) return null;
  return { tipo: "efetiva", bsPorReal: taxaEfetiva(ultimo.valorOrigem, ultimo.valorDestino), data: ultimo.data };
}

export interface DecisaoDeTroca {
  /** bolivianos que faltam no fim do mês (0 se não falta) */
  falta: Dinheiro;
  /** falta + margem de segurança */
  comprar: Dinheiro;
  /** quanto sai em real, arredondado para cima: comprar ÷ taxa efetiva */
  custo: Dinheiro;
  taxa: Taxa;
}

/**
 * Quanto boliviano comprar e quanto custa em real.
 * Recusa o câmbio de referência: decidir troca com taxa de comparação é o erro
 * que o PRD descreve (os R$ 301,78 que não fechavam).
 */
export function decidirTroca(saldoFimBob: Dinheiro, taxa: Taxa, margem: Dinheiro = dinheiro(0, "BOB")): DecisaoDeTroca {
  if (taxa.tipo !== "efetiva") throw new Error("A decisão de troca usa o câmbio efetivo, nunca o de referência.");
  if (saldoFimBob.moeda !== "BOB" || margem.moeda !== "BOB") throw new Error("Saldo e margem precisam estar em boliviano.");
  if (!(taxa.bsPorReal > 0)) throw new RangeError("taxa inválida");
  const falta = Math.max(0, -saldoFimBob.centavos);
  const comprar = falta > 0 ? falta + Math.max(0, margem.centavos) : 0;
  return {
    falta: dinheiro(falta, "BOB"),
    comprar: dinheiro(comprar, "BOB"),
    // para cima: é melhor sobrar um centavo de boliviano do que faltar
    custo: dinheiro(comprar === 0 ? 0 : Math.ceil(comprar / taxa.bsPorReal - 1e-9), "BRL"),
    taxa,
  };
}

/**
 * Diferença de uma troca contra o câmbio de referência, apurada e não escondida
 * (PRD, seção 3, regra 6). Positiva = a troca rendeu mais boliviano do que a
 * referência supõe. Nunca é gravada: muda se a referência mudar.
 */
export function diferencaContraReferencia(c: CambioBase, referencia: Taxa) {
  if (referencia.tipo !== "referencia") throw new Error("Compare com o câmbio de referência.");
  const [reais, bolivianos, comprouBob] =
    c.valorOrigem.moeda === "BRL"
      ? [c.valorOrigem, c.valorDestino, true]
      : [c.valorDestino, c.valorOrigem, false];
  const esperado = Math.round(reais.centavos * referencia.bsPorReal); // Bs pela referência
  const difBob = comprouBob ? bolivianos.centavos - esperado : esperado - bolivianos.centavos;
  return {
    emBolivianos: dinheiro(difBob, "BOB"),
    emReais: dinheiro(Math.round(difBob / referencia.bsPorReal), "BRL"),
    referencia,
  };
}

// ---------------------------------------------------------------------------
// Comparador de rotas: cambista × USDT
// ---------------------------------------------------------------------------

export interface RotaCambista {
  /** quantos bolivianos o cambista dá por real */
  bsPorReal: number;
}

export interface RotaUsdt {
  /** preço do USDT na compra em real (ex.: 5,40) */
  reaisPorUsdt: number;
  /** comissão da compra, em % do USDT */
  taxaCompraPct: number;
  /** tarifa fixa em real (envio, saque, rede) */
  tarifaReais: number;
  /** preço do USDT na venda em boliviano (ex.: 11,05) */
  bsPorUsdt: number;
  /** comissão da venda, em % do boliviano */
  taxaVendaPct: number;
}

export interface ResultadoRota {
  rota: "cambista" | "usdt";
  recebe: Dinheiro; // em boliviano, arredondado para baixo
  bsPorReal: number; // taxa efetiva da rota
}

const pct = (p: number) => {
  if (!(p >= 0 && p < 100)) throw new RangeError("percentual inválido");
  return 1 - p / 100;
};

export function rotaCambista(reais: Dinheiro, r: RotaCambista): ResultadoRota {
  if (reais.moeda !== "BRL") throw new Error("O valor da troca é em real.");
  if (!(r.bsPorReal > 0)) throw new RangeError("cotação do cambista inválida");
  const bs = Math.floor(reais.centavos * r.bsPorReal + 1e-9);
  return { rota: "cambista", recebe: dinheiro(bs, "BOB"), bsPorReal: reais.centavos > 0 ? bs / reais.centavos : 0 };
}

export function rotaUsdt(reais: Dinheiro, r: RotaUsdt): ResultadoRota {
  if (reais.moeda !== "BRL") throw new Error("O valor da troca é em real.");
  if (!(r.reaisPorUsdt > 0) || !(r.bsPorUsdt > 0) || !(r.tarifaReais >= 0)) throw new RangeError("cotação USDT inválida");
  const liquido = Math.max(0, reais.centavos - Math.round(r.tarifaReais * 100));
  const usdt = (liquido / r.reaisPorUsdt) * pct(r.taxaCompraPct); // em "centavos de USDT"
  const bs = Math.floor(usdt * r.bsPorUsdt * pct(r.taxaVendaPct) + 1e-9);
  return { rota: "usdt", recebe: dinheiro(bs, "BOB"), bsPorReal: reais.centavos > 0 ? bs / reais.centavos : 0 };
}

export function compararRotas(reais: Dinheiro, cambista: RotaCambista, usdt: RotaUsdt) {
  const a = rotaCambista(reais, cambista);
  const b = rotaUsdt(reais, usdt);
  const melhor = b.recebe.centavos > a.recebe.centavos ? b : a;
  return { cambista: a, usdt: b, melhor, vantagem: dinheiro(Math.abs(a.recebe.centavos - b.recebe.centavos), "BOB") };
}

