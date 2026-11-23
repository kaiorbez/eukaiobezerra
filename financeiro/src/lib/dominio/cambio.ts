import { type Dinheiro, type Moeda, MoedasDiferentesError } from "./moeda";

/**
 * Taxa de câmbio, sempre em bolivianos por real (Bs/R$), e sempre com origem:
 * referência (parâmetro editável) ou efetiva (operação de troca registrada).
 * Os dois câmbios nunca se misturam (PRD, seção 3, regra 3).
 */
export type TipoTaxa = "referencia" | "efetiva";

export interface Taxa {
  readonly tipo: TipoTaxa;
  /** Bolivianos por real. */
  readonly bsPorReal: number;
  /** Data (YYYY-MM-DD) em que a taxa vale. */
  readonly data: string;
}

export const CASAS_TAXA = 6; // numeric(12,6)

function arredondar(x: number, casas: number): number {
  const f = 10 ** casas;
  return Math.round(x * f) / f;
}

/**
 * Taxa efetiva de uma troca: valor que entrou ÷ valor que saiu, em Bs por R$.
 * Aceita a troca nos dois sentidos (R$→Bs ou Bs→R$).
 */
export function taxaEfetiva(saiu: Dinheiro, entrou: Dinheiro): number {
  if (saiu.moeda === entrou.moeda) {
    throw new Error("Uma troca liga duas moedas diferentes.");
  }
  if (saiu.centavos <= 0 || entrou.centavos <= 0) {
    throw new RangeError("Os dois lados da troca precisam ser positivos.");
  }
  const [reais, bolivianos] = saiu.moeda === "BRL" ? [saiu, entrou] : [entrou, saiu];
  return arredondar(bolivianos.centavos / reais.centavos, CASAS_TAXA);
}

/** Valor convertido, que carrega a taxa usada para nunca aparecer sem ela. */
export interface Convertido {
  readonly valor: Dinheiro;
  readonly original: Dinheiro;
  readonly taxa: Taxa;
}

/** Converte usando uma taxa declarada. O resultado sempre leva a taxa junto. */
export function converter(v: Dinheiro, para: Moeda, taxa: Taxa): Convertido {
  if (!(taxa.bsPorReal > 0)) throw new RangeError("taxa inválida");
  if (v.moeda === para) return { valor: v, original: v, taxa };
  const centavos =
    v.moeda === "BOB" ? v.centavos / taxa.bsPorReal : v.centavos * taxa.bsPorReal;
  // arredonda meio para longe do zero
  const c = Math.sign(centavos) * Math.round(Math.abs(centavos));
  return { valor: { centavos: c, moeda: para }, original: v, taxa };
}

export function exigirMesmaMoeda(a: Moeda, b: Moeda): void {
  if (a !== b) throw new MoedasDiferentesError(a, b);
}

const fmtTaxa = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 4 });

/** "2,0483 Bs/R$" */
export function formatarTaxa(bsPorReal: number): string {
  return `${fmtTaxa.format(bsPorReal)} Bs/R$`;
}

/** Diferença relativa entre a efetiva e a referência (0,024 = 2,4%). */
export function divergencia(efetiva: number, referencia: number): number {
  return (efetiva - referencia) / referencia;
}

/** O PRD pede aviso quando a última troca diverge mais de 3% da referência. */
export const LIMITE_DIVERGENCIA = 0.03;

/**
 * Lê uma taxa digitada ("2,048", "2.0483", "2"). Em taxa não existe separador
 * de milhar, então ponto e vírgula são os dois o decimal. Até 6 casas.
 */
export function taxaDeEntrada(entrada: string): number | null {
  const t = entrada.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,6})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}
