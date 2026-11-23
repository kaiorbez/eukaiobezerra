/** Marcas redondas (1, 2, 2,5 ou 5 × 10ⁿ) cobrindo os dados e o zero. */
export function marcasRedondas(min: number, max: number, alvo = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (lo === hi) return [0, 1];
  const bruto = (hi - lo) / alvo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((p) => p >= bruto) ?? 10 * pot;
  const marcas: number[] = [];
  for (let v = Math.floor(lo / passo) * passo; v <= Math.ceil(hi / passo) * passo + passo / 2; v += passo) {
    marcas.push(Math.round(v * 100) / 100);
  }
  return marcas;
}
