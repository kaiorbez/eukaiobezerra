/**
 * MASSA DE TESTE SINTÉTICA — não são os lançamentos reais de novembro.
 *
 * Foi montada à mão para que os totais caiam exatamente nos números da seção 8 do PRD
 * (saldos, a pagar, a receber, resultado e rateio). Serve para provar que o cálculo
 * e as regras de moeda reproduzem esses números. O portão real da fase 2 só passa
 * quando os lançamentos verdadeiros de novembro forem cadastrados e baterem também.
 */
import { dinheiro } from "../moeda";
import type { CambioBase, ContaBase } from "../saldo";
import type { LancamentoComAmbito } from "../resultado";

export const HOJE = "2026-11-22";
export const MES = "2026-11";

export const contaReais: ContaBase = { id: "brl", moeda: "BRL", saldoInicial: dinheiro(-14355, "BRL") };
export const contaBolivianos: ContaBase = { id: "bob", moeda: "BOB", saldoInicial: dinheiro(403382, "BOB") };

type L = LancamentoComAmbito & { descricao: string };

const r = (data: string, descricao: string, reais: number, status: "pago" | "previsto"): L => ({
  contaId: "brl", data, descricao, valor: dinheiro(reais, "BRL"), tipo: "receita", status, ambito: "empresa",
});
const dR = (data: string, descricao: string, c: number, status: "pago" | "previsto", ambito: L["ambito"] = "empresa"): L => ({
  contaId: "brl", data, descricao, valor: dinheiro(c, "BRL"), tipo: "despesa", status, ambito,
});
const dB = (data: string, descricao: string, c: number, status: "pago" | "previsto", ambito: L["ambito"] = "pessoal"): L => ({
  contaId: "bob", data, descricao, valor: dinheiro(c, "BOB"), tipo: "despesa", status, ambito,
});

export const lancamentos: L[] = [
  // receitas, em real
  r("2026-11-05", "Cliente A", 300000, "pago"),
  r("2026-11-12", "Cliente B", 238663, "pago"),
  r("2026-11-28", "Cliente C", 67500, "previsto"),
  // despesas da empresa, em real
  dR("2026-11-03", "Ferramentas", 38990, "pago"),
  dR("2026-11-08", "Assinaturas", 19900, "pago"),
  dR("2026-11-15", "Tarifas bancárias", 13766, "pago"),
  dR("2026-11-25", "DAS Simples", 53045, "previsto"),
  dR("2026-11-30", "Contador", 30000, "previsto"),
  // casa (rateada), em boliviano
  dB("2026-11-01", "Aluguel", 300000, "pago", "casa"),
  dB("2026-11-10", "Energia", 20000, "pago", "casa"),
  // pessoais, em boliviano
  dB("2026-11-04", "Yango", 24800, "pago"),
  dB("2026-11-06", "Mercado", 215030, "pago"),
  dB("2026-11-09", "Restaurantes", 146300, "pago"),
  dB("2026-11-13", "Farmácia", 85000, "pago"),
  dB("2026-11-16", "Lazer", 64000, "pago"),
  dB("2026-11-18", "Celular", 16000, "pago"),
  dB("2026-11-20", "Yango", 135000, "pago"),
  dB("2026-11-27", "Faculdade", 193000, "previsto"),
];

export const cambios: CambioBase[] = [
  {
    data: "2026-11-21",
    contaOrigemId: "brl",
    valorOrigem: dinheiro(320000, "BRL"),
    contaDestinoId: "bob",
    valorDestino: dinheiro(655460, "BOB"),
  },
];
