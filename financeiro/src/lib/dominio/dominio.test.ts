import { describe, expect, it } from "vitest";
import {
  MoedasDiferentesError,
  centavosDeDecimal,
  centavosDeEntrada,
  converter,
  decimalDeCentavos,
  dinheiro,
  ehDataISO,
  formatar,
  formatarTaxa,
  hoje,
  saldoDaConta,
  somar,
  taxaEfetiva,
  totaisPorMoeda,
  ultimoDia,
  somarMeses,
} from "./index";

describe("moeda", () => {
  it("Bs 248,00 lido do banco volta 248,00 e BOB, nunca 124,00 e BRL", () => {
    const v = dinheiro(centavosDeDecimal("248.00"), "BOB");
    expect(v).toEqual({ centavos: 24800, moeda: "BOB" });
    expect(decimalDeCentavos(v.centavos)).toBe("248.00");
    expect(formatar(v)).toBe("Bs 248,00");
  });

  it("lê decimais do Postgres sem float", () => {
    expect(centavosDeDecimal("1316.52")).toBe(131652);
    expect(centavosDeDecimal("-1402.88")).toBe(-140288);
    expect(centavosDeDecimal("0.1")).toBe(10);
    expect(centavosDeDecimal("7")).toBe(700);
    expect(() => centavosDeDecimal("1,5")).toThrow();
    expect(() => centavosDeDecimal("1.234")).toThrow();
  });

  it("ida e volta de texto não perde centavo", () => {
    for (const c of [0, 1, 99, 100, 131652, -140288, 755266, 99999999999999]) {
      expect(centavosDeDecimal(decimalDeCentavos(c))).toBe(c);
    }
  });

  it("lê o que a pessoa digita", () => {
    expect(centavosDeEntrada("1.234,56")).toBe(123456);
    expect(centavosDeEntrada("1234,56")).toBe(123456);
    expect(centavosDeEntrada("248")).toBe(24800);
    expect(centavosDeEntrada("248,5")).toBe(24850);
    expect(centavosDeEntrada("248.50")).toBe(24850);
    expect(centavosDeEntrada("3.200")).toBe(320000);
    expect(centavosDeEntrada("6.554,60")).toBe(655460);
    expect(centavosDeEntrada("R$ 7.552,66")).toBe(755266);
    expect(centavosDeEntrada("Bs 248")).toBe(24800);
    expect(centavosDeEntrada("")).toBeNull();
    expect(centavosDeEntrada("abc")).toBeNull();
    expect(centavosDeEntrada("1,2,3")).toBeNull();
    expect(centavosDeEntrada("12.34.5")).toBeNull();
  });

  it("formata no padrão brasileiro com o símbolo da moeda", () => {
    expect(formatar(dinheiro(131652, "BRL"))).toBe("R$ 1.316,52");
    expect(formatar(dinheiro(-140288, "BOB"))).toBe("Bs −1.402,88");
  });

  it("recusa somar moedas diferentes", () => {
    expect(() => somar(dinheiro(100, "BRL"), dinheiro(100, "BOB"))).toThrow(MoedasDiferentesError);
  });

  it("totais por moeda ficam separados, nunca em um só", () => {
    const t = totaisPorMoeda([
      dinheiro(50000, "BRL"),
      dinheiro(33045, "BRL"),
      dinheiro(120000, "BOB"),
      dinheiro(73000, "BOB"),
    ]);
    expect(t.BRL).toEqual(dinheiro(83045, "BRL"));
    expect(t.BOB).toEqual(dinheiro(193000, "BOB"));
  });
});

describe("câmbio", () => {
  it("a troca de 21/11 — R$ 3.200,00 por Bs 6.554,60 — tem taxa efetiva 2,0483", () => {
    const t = taxaEfetiva(dinheiro(320000, "BRL"), dinheiro(655460, "BOB"));
    expect(t).toBeCloseTo(2.048313, 6);
    expect(Math.round(t * 10000) / 10000).toBe(2.0483);
    expect(formatarTaxa(t)).toBe("2,0483 Bs/R$");
  });

  it("a taxa é a mesma qualquer que seja o sentido da troca", () => {
    expect(taxaEfetiva(dinheiro(655460, "BOB"), dinheiro(320000, "BRL"))).toBeCloseTo(2.048313, 6);
  });

  it("troca na mesma moeda não existe", () => {
    expect(() => taxaEfetiva(dinheiro(100, "BRL"), dinheiro(100, "BRL"))).toThrow();
  });

  it("toda conversão carrega a taxa e a data usadas", () => {
    const taxa = { tipo: "referencia" as const, bsPorReal: 2, data: "2026-11-01" };
    const c = converter(dinheiro(24800, "BOB"), "BRL", taxa);
    expect(c.valor).toEqual(dinheiro(12400, "BRL"));
    expect(c.original).toEqual(dinheiro(24800, "BOB"));
    expect(c.taxa).toBe(taxa);
  });
});

describe("saldo", () => {
  const conta = { id: "bs", moeda: "BOB" as const, saldoInicial: dinheiro(10000, "BOB") };
  const outra = { id: "rs", moeda: "BRL" as const, saldoInicial: dinheiro(0, "BRL") };

  it("confirmado só leva o pago até hoje; o fim do mês leva o previsto", () => {
    const s = saldoDaConta(
      conta,
      [
        { contaId: "bs", data: "2026-11-05", valor: dinheiro(24800, "BOB"), tipo: "despesa", status: "pago" },
        { contaId: "bs", data: "2026-11-10", valor: dinheiro(50000, "BOB"), tipo: "receita", status: "pago" },
        { contaId: "bs", data: "2026-11-28", valor: dinheiro(30000, "BOB"), tipo: "despesa", status: "previsto" },
        { contaId: "bs", data: "2026-12-02", valor: dinheiro(99900, "BOB"), tipo: "despesa", status: "previsto" },
        { contaId: "rs", data: "2026-11-05", valor: dinheiro(70000, "BRL"), tipo: "despesa", status: "pago" },
      ],
      [],
      "2026-11-22",
      "2026-11-30",
    );
    expect(s.confirmado).toEqual(dinheiro(10000 - 24800 + 50000, "BOB"));
    expect(s.noFim).toEqual(dinheiro(10000 - 24800 + 50000 - 30000, "BOB"));
  });

  it("câmbio tira de uma conta e põe na outra, cada uma na sua moeda", () => {
    const cambios = [
      {
        data: "2026-11-21",
        contaOrigemId: "rs",
        valorOrigem: dinheiro(320000, "BRL"),
        contaDestinoId: "bs",
        valorDestino: dinheiro(655460, "BOB"),
      },
    ];
    expect(saldoDaConta(outra, [], cambios, "2026-11-22").confirmado).toEqual(dinheiro(-320000, "BRL"));
    expect(saldoDaConta(conta, [], cambios, "2026-11-22").confirmado).toEqual(dinheiro(665460, "BOB"));
    expect(saldoDaConta(conta, [], cambios, "2026-11-20").confirmado).toEqual(dinheiro(10000, "BOB"));
  });

  it("lançamento na moeda errada para a conta é erro, não conversão", () => {
    expect(() =>
      saldoDaConta(
        conta,
        [{ contaId: "bs", data: "2026-11-05", valor: dinheiro(100, "BRL"), tipo: "despesa", status: "pago" }],
        [],
        "2026-11-22",
      ),
    ).toThrow(MoedasDiferentesError);
  });
});

describe("datas", () => {
  it("o dia 30 continua dia 30 em Santa Cruz", () => {
    // 30/11 às 02:00 UTC ainda é 29/11 em La Paz (UTC−4)
    expect(hoje(new Date("2026-11-30T02:00:00Z"))).toBe("2026-11-29");
    expect(hoje(new Date("2026-11-30T05:00:00Z"))).toBe("2026-11-30");
  });

  it("calendário", () => {
    expect(ultimoDia("2026-11")).toBe("2026-11-30");
    expect(ultimoDia("2028-02")).toBe("2028-02-29");
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(ehDataISO("2026-02-30")).toBe(false);
    expect(ehDataISO("2026-11-21")).toBe(true);
  });
});
