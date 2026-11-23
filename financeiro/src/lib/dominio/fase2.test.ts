import { describe, expect, it } from "vitest";
import * as nov from "./__fixtures__/novembro-2026";
import {
  type Taxa,
  diasDoFluxo,
  dinheiro,
  fluxoDaConta,
  formatar,
  pendentes,
  rateioDoMes,
  resultadoDoMes,
  saldoDaConta,
  totaisPorMoeda,
  ultimoDia,
} from "./index";

const DE = "2026-11-01";
const ATE = ultimoDia(nov.MES);
const referencia: Taxa = { tipo: "referencia", bsPorReal: 2, data: "2026-11-01" };
const saldo = (c: typeof nov.contaReais) => saldoDaConta(c, nov.lancamentos, nov.cambios, nov.HOJE, ATE);

describe("critérios de aceite da seção 8 (massa sintética de novembro)", () => {
  it("a conta em reais mostra R$ 1.316,52 confirmado e R$ 1.161,07 no fim do mês", () => {
    const s = saldo(nov.contaReais);
    expect(formatar(s.confirmado)).toBe("R$ 1.316,52");
    expect(formatar(s.noFim)).toBe("R$ 1.161,07");
  });

  it("a conta em bolivianos mostra Bs 527,12 confirmado e Bs −1.402,88 no fim do mês", () => {
    const s = saldo(nov.contaBolivianos);
    expect(formatar(s.confirmado)).toBe("Bs 527,12");
    expect(formatar(s.noFim)).toBe("Bs −1.402,88");
  });

  it("contas a pagar soma R$ 830,45 e Bs 1.930,00 em totais separados", () => {
    const t = totaisPorMoeda(pendentes(nov.lancamentos, "despesa", ATE).map((l) => l.valor));
    expect(t.BRL).toEqual(dinheiro(83045, "BRL"));
    expect(t.BOB).toEqual(dinheiro(193000, "BOB"));
  });

  it("contas a receber soma R$ 675,00", () => {
    const t = totaisPorMoeda(pendentes(nov.lancamentos, "receita", ATE).map((l) => l.valor));
    expect(t.BRL).toEqual(dinheiro(67500, "BRL"));
    expect(t.BOB).toEqual(dinheiro(0, "BOB"));
  });

  it("resultado do mês: R$ 6.061,63 − R$ 7.552,66 = −R$ 1.491,03", () => {
    const r = resultadoDoMes(nov.lancamentos, DE, ATE, referencia);
    expect(formatar(r.receitas.emReais)).toBe("R$ 6.061,63");
    expect(formatar(r.despesas.emReais)).toBe("R$ 7.552,66");
    expect(formatar(r.resultado)).toBe("R$ −1.491,03");
    expect(r.taxa).toBe(referencia); // a taxa viaja com o número
  });

  it("rateio de 50%: empresa R$ 2.357,01 e pessoal R$ 5.195,65, somando R$ 7.552,66", () => {
    const r = rateioDoMes(nov.lancamentos, DE, ATE, referencia, 50);
    expect(formatar(r.empresa)).toBe("R$ 2.357,01");
    expect(formatar(r.pessoal)).toBe("R$ 5.195,65");
    expect(formatar(r.total)).toBe("R$ 7.552,66");
  });

  it("o câmbio de 21/11 não aparece como despesa nem receita", () => {
    const r = resultadoDoMes(nov.lancamentos, DE, ATE, referencia);
    expect(r.despesas.nativo.BRL).toEqual(dinheiro(155701, "BRL"));
    expect(r.despesas.nativo.BOB).toEqual(dinheiro(1199130, "BOB"));
  });
});

describe("parâmetros não vazam (os dois critérios mais importantes)", () => {
  it("mudar o câmbio de referência altera o resultado e não altera nenhum saldo de conta", () => {
    const outra: Taxa = { tipo: "referencia", bsPorReal: 2.1, data: "2026-11-22" };
    const a = resultadoDoMes(nov.lancamentos, DE, ATE, referencia);
    const b = resultadoDoMes(nov.lancamentos, DE, ATE, outra);
    expect(b.resultado).not.toEqual(a.resultado);
    expect(saldo(nov.contaReais).confirmado).toEqual(dinheiro(131652, "BRL"));
    expect(saldo(nov.contaBolivianos).noFim).toEqual(dinheiro(-140288, "BOB"));
    // e os totais nativos também não mudam
    expect(b.despesas.nativo).toEqual(a.despesas.nativo);
  });

  it("mudar o rateio altera a divisão e não altera nenhum total do mês", () => {
    const total = resultadoDoMes(nov.lancamentos, DE, ATE, referencia).despesas.emReais;
    for (const pct of [0, 33.33, 50, 66.67, 100]) {
      const r = rateioDoMes(nov.lancamentos, DE, ATE, referencia, pct);
      expect(r.total).toEqual(total);
      expect(r.empresa.centavos + r.pessoal.centavos).toBe(total.centavos);
    }
    expect(rateioDoMes(nov.lancamentos, DE, ATE, referencia, 0).empresa).toEqual(dinheiro(155701, "BRL"));
    expect(rateioDoMes(nov.lancamentos, DE, ATE, referencia, 100).empresa).toEqual(dinheiro(315701, "BRL"));
  });

  it("resultado e rateio recusam o câmbio efetivo", () => {
    const efetiva: Taxa = { tipo: "efetiva", bsPorReal: 2.0483, data: "2026-11-21" };
    expect(() => resultadoDoMes(nov.lancamentos, DE, ATE, efetiva)).toThrow();
    expect(() => rateioDoMes(nov.lancamentos, DE, ATE, efetiva, 50)).toThrow();
  });
});

describe("fluxo de caixa", () => {
  it("vai de hoje ao fim do mês e termina no saldo previsto de cada conta", () => {
    const dias = diasDoFluxo(nov.MES, nov.HOJE);
    expect(dias[0]).toBe("2026-11-22");
    expect(dias.at(-1)).toBe("2026-11-30");
    const brl = fluxoDaConta(nov.contaReais, nov.lancamentos, nov.cambios, dias, nov.HOJE);
    const bob = fluxoDaConta(nov.contaBolivianos, nov.lancamentos, nov.cambios, dias, nov.HOJE);
    expect(brl[0].centavos).toBe(131652);
    expect(brl.at(-1)?.centavos).toBe(116107);
    expect(bob[0].centavos).toBe(52712);
    expect(bob.at(-1)?.centavos).toBe(-140288);
    // a faculdade (Bs 1.930) cai no dia 27
    expect(bob.find((p) => p.data === "2026-11-27")?.centavos).toBe(52712 - 193000);
  });

  it("mês passado mostra o mês inteiro", () => {
    expect(diasDoFluxo("2026-10", nov.HOJE)).toHaveLength(31);
  });
});

import { marcasRedondas } from "@/lib/eixo";

describe("eixo do gráfico", () => {
  it("usa marcas redondas que incluem o zero", () => {
    expect(marcasRedondas(-1402.88, 527.12)).toEqual([-1500, -1000, -500, 0, 500, 1000]);
    expect(marcasRedondas(1161.07, 1516.52)).toEqual([0, 500, 1000, 1500, 2000]);
  });
});
