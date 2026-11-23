import { describe, expect, it } from "vitest";
import * as nov from "./__fixtures__/novembro-2026";
import {
  type Taxa,
  compararRotas,
  decidirTroca,
  diferencaContraReferencia,
  dinheiro,
  formatar,
  formatarTaxa,
  saldoDaConta,
  ultimaTaxaEfetiva,
  ultimoDia,
} from "./index";

const referencia: Taxa = { tipo: "referencia", bsPorReal: 2, data: "2026-11-01" };

describe("câmbio efetivo", () => {
  it("a troca de 21/11 devolve taxa efetiva 2,0483 (portão da fase 3)", () => {
    const t = ultimaTaxaEfetiva(nov.cambios);
    expect(t?.tipo).toBe("efetiva");
    expect(t?.data).toBe("2026-11-21");
    expect(formatarTaxa(t?.bsPorReal ?? 0)).toBe("2,0483 Bs/R$");
  });

  it("a mais recente vale, qualquer que seja a ordem da lista", () => {
    const antiga = { ...nov.cambios[0], data: "2026-10-02", valorDestino: dinheiro(640000, "BOB") };
    expect(ultimaTaxaEfetiva([antiga, ...nov.cambios])?.data).toBe("2026-11-21");
    expect(ultimaTaxaEfetiva([...nov.cambios, antiga])?.data).toBe("2026-11-21");
    expect(ultimaTaxaEfetiva([])).toBeNull();
  });
});

describe("decisão de quanto trocar", () => {
  const fimBob = saldoDaConta(nov.contaBolivianos, nov.lancamentos, nov.cambios, nov.HOJE, ultimoDia(nov.MES)).noFim;
  const efetiva = ultimaTaxaEfetiva(nov.cambios) as Taxa;

  it("faltam Bs 1.402,88 e custam R$ 684,90 ao câmbio efetivo", () => {
    const d = decidirTroca(fimBob, efetiva);
    expect(formatar(d.falta)).toBe("Bs 1.402,88");
    expect(formatar(d.custo)).toBe("R$ 684,90");
    // o custo compra pelo menos o que falta
    expect(Math.floor(d.custo.centavos * efetiva.bsPorReal)).toBeGreaterThanOrEqual(d.falta.centavos);
  });

  it("usa o câmbio efetivo, não o de referência", () => {
    expect(() => decidirTroca(fimBob, referencia)).toThrow(/efetivo/);
    // pela referência daria R$ 701,44 — R$ 16,54 a mais
    expect(formatar(decidirTroca(fimBob, { ...referencia, tipo: "efetiva" }).custo)).toBe("R$ 701,44");
  });

  it("a margem de segurança entra só quando falta algo", () => {
    expect(decidirTroca(fimBob, efetiva, dinheiro(20000, "BOB")).comprar).toEqual(dinheiro(160288, "BOB"));
    const sobra = decidirTroca(dinheiro(5000, "BOB"), efetiva, dinheiro(20000, "BOB"));
    expect(sobra.comprar).toEqual(dinheiro(0, "BOB"));
    expect(sobra.custo).toEqual(dinheiro(0, "BRL"));
  });

  it("a taxa sobrescrita pelo usuário muda o custo", () => {
    const manual: Taxa = { tipo: "efetiva", bsPorReal: 2.1, data: nov.HOJE };
    expect(formatar(decidirTroca(fimBob, manual).custo)).toBe("R$ 668,04");
  });
});

describe("diferença contra a referência", () => {
  it("a troca de 21/11 rendeu Bs 154,60 (R$ 77,30) a mais que a referência de 2,000", () => {
    const d = diferencaContraReferencia(nov.cambios[0], referencia);
    expect(formatar(d.emBolivianos)).toBe("Bs 154,60");
    expect(formatar(d.emReais)).toBe("R$ 77,30");
  });

  it("vender boliviano abaixo da referência dá diferença negativa", () => {
    const venda = {
      data: "2026-11-25",
      contaOrigemId: "bob",
      valorOrigem: dinheiro(210000, "BOB"),
      contaDestinoId: "brl",
      valorDestino: dinheiro(100000, "BRL"),
    };
    expect(diferencaContraReferencia(venda, referencia).emBolivianos).toEqual(dinheiro(-10000, "BOB"));
  });
});

describe("comparador de rotas", () => {
  const usdt = { reaisPorUsdt: 5.4, taxaCompraPct: 0.1, tarifaReais: 0, bsPorUsdt: 11.2, taxaVendaPct: 0 };

  it("compara cambista e USDT para o mesmo valor em real", () => {
    const r = compararRotas(dinheiro(320000, "BRL"), { bsPorReal: 2.048 }, usdt);
    expect(formatar(r.cambista.recebe)).toBe("Bs 6.553,60");
    // 3200 / 5,40 = 592,59 USDT − 0,1% = 591,99 × 11,20 = Bs 6.630,40
    expect(formatar(r.usdt.recebe)).toBe("Bs 6.630,40");
    expect(r.melhor.rota).toBe("usdt");
    expect(formatar(r.vantagem)).toBe("Bs 76,80");
  });

  it("tarifa fixa pesa mais em troca pequena", () => {
    const comTarifa = { ...usdt, tarifaReais: 15 };
    expect(compararRotas(dinheiro(10000, "BRL"), { bsPorReal: 2.048 }, comTarifa).melhor.rota).toBe("cambista");
  });

  it("recusa valores fora da faixa", () => {
    expect(() => compararRotas(dinheiro(100, "BRL"), { bsPorReal: 0 }, usdt)).toThrow();
    expect(() => compararRotas(dinheiro(100, "BRL"), { bsPorReal: 2 }, { ...usdt, taxaVendaPct: 120 })).toThrow();
  });
});
