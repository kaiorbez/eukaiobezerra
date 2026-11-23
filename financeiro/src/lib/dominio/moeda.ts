/**
 * Dinheiro com moeda. O par valor + moeda nunca se separa (PRD, seção 3 e 4).
 *
 * Valores são guardados em centavos inteiros: ponto flutuante erra centavos.
 * Nenhuma função daqui converte entre moedas — conversão mora em `conversao.ts`
 * e sempre carrega a taxa e a data usadas.
 */

export const MOEDAS = ["BRL", "BOB"] as const;
export type Moeda = (typeof MOEDAS)[number];

export const SIMBOLO: Record<Moeda, string> = { BRL: "R$", BOB: "Bs" };
export const NOME_MOEDA: Record<Moeda, string> = { BRL: "Real", BOB: "Boliviano" };

export interface Dinheiro {
  /** Valor em centavos, inteiro e com sinal. */
  readonly centavos: number;
  readonly moeda: Moeda;
}

export class MoedasDiferentesError extends Error {
  constructor(a: Moeda, b: Moeda) {
    super(`Não se soma ${a} com ${b} sem declarar a taxa de câmbio.`);
    this.name = "MoedasDiferentesError";
  }
}

export function ehMoeda(x: unknown): x is Moeda {
  return typeof x === "string" && (MOEDAS as readonly string[]).includes(x);
}

export function dinheiro(centavos: number, moeda: Moeda): Dinheiro {
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError(`centavos precisa ser inteiro: ${centavos}`);
  }
  return { centavos, moeda };
}

export const zero = (moeda: Moeda): Dinheiro => dinheiro(0, moeda);

/**
 * Lê o texto que o Postgres devolve para numeric(14,2) — "248.00", "-1402.88", "7" —
 * sem passar por float.
 */
export function centavosDeDecimal(texto: string): number {
  const t = texto.trim();
  const m = /^(-|\+)?(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) throw new SyntaxError(`valor decimal inválido: "${texto}"`);
  const [, sinal, inteiro, frac = ""] = m;
  const c = Number(inteiro) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(c)) throw new RangeError(`valor grande demais: "${texto}"`);
  return sinal === "-" ? -c : c;
}

/** O inverso: centavos para o texto decimal que o Postgres aceita ("248.00"). */
export function decimalDeCentavos(centavos: number): string {
  const neg = centavos < 0;
  const abs = Math.abs(centavos);
  const s = `${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return neg ? `-${s}` : s;
}

/**
 * Lê o que a pessoa digitou no formulário, no jeito brasileiro ou não:
 * "1.234,56", "1234,56", "248", "248.5", "R$ 1.234,56", "Bs 248".
 * Devolve centavos ou null se não der para ler sem ambiguidade.
 */
export function centavosDeEntrada(entrada: string): number | null {
  let t = entrada.trim().replace(/^(R\$|Bs\.?)\s*/i, "").replace(/\s/g, "");
  if (t === "") return null;
  let sinal = 1;
  if (t.startsWith("-")) {
    sinal = -1;
    t = t.slice(1);
  }
  let normal: string;
  if (t.includes(",")) {
    // vírgula é o decimal; pontos são milhar
    if ((t.match(/,/g) ?? []).length > 1) return null;
    const [int, frac] = t.split(",");
    if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(int) || !/^\d{0,2}$/.test(frac)) return null;
    normal = `${int.replace(/\./g, "")}.${frac || "0"}`;
  } else if (/^\d+\.\d{1,2}$/.test(t)) {
    // um único ponto com 1 ou 2 casas: decimal
    normal = t;
  } else if (/^\d{1,3}(\.\d{3})+$|^\d+$/.test(t)) {
    // pontos como separador de milhar
    normal = t.replace(/\./g, "");
  } else {
    return null;
  }
  try {
    return sinal * centavosDeDecimal(normal);
  } catch {
    return null;
  }
}

export function somar(a: Dinheiro, b: Dinheiro): Dinheiro {
  if (a.moeda !== b.moeda) throw new MoedasDiferentesError(a.moeda, b.moeda);
  return dinheiro(a.centavos + b.centavos, a.moeda);
}

/** Soma valores de uma moeda só. Lança erro se aparecer outra moeda. */
export function somarTodos(moeda: Moeda, valores: Iterable<Dinheiro>): Dinheiro {
  let total = zero(moeda);
  for (const v of valores) total = somar(total, v);
  return total;
}

/** Totais separados por moeda — nunca um total único. */
export function totaisPorMoeda(valores: Iterable<Dinheiro>): Record<Moeda, Dinheiro> {
  const t: Record<Moeda, Dinheiro> = { BRL: zero("BRL"), BOB: zero("BOB") };
  for (const v of valores) t[v.moeda] = somar(t[v.moeda], v);
  return t;
}

export function negar(v: Dinheiro): Dinheiro {
  return dinheiro(-v.centavos, v.moeda);
}

const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R$ 1.316,52", "Bs −1.402,88". */
export function formatar(v: Dinheiro, opcoes: { sinal?: boolean } = {}): string {
  const abs = fmt.format(Math.abs(v.centavos) / 100);
  const menos = v.centavos < 0 ? "−" : opcoes.sinal && v.centavos > 0 ? "+" : "";
  return `${SIMBOLO[v.moeda]} ${menos}${abs}`;
}

/** Só o número, sem símbolo: "1.316,52". Para campos de formulário. */
export function formatarNumero(centavos: number): string {
  return fmt.format(centavos / 100);
}
