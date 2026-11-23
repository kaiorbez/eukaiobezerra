import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { NavegadorMes } from "@/components/moldura/navegador-mes";
import { CartaoFluxo } from "@/components/visao-geral/cartao-fluxo";
import { CartaoSaldos } from "@/components/visao-geral/cartao-saldos";
import { CartaoPendentes, CartaoResultado, CartaoUltimos } from "@/components/visao-geral/cartoes";
import type { ContaResumo } from "@/components/visao-geral/tipos";
import { lerConfig, listarCambios, listarContas, listarLancamentos } from "@/lib/dados";
import {
  type Dinheiro,
  MOEDAS,
  NOME_MOEDA,
  type Taxa,
  diasDoFluxo,
  ehMesISO,
  fluxoDaConta,
  formatar,
  formatarData,
  formatarTaxa,
  hoje as hojeEm,
  mesDe,
  pendentes,
  primeiroDia,
  rateioDoMes,
  resultadoDoMes,
  rotuloMes,
  saldoDaConta,
  totaisPorMoeda,
  ultimoDia,
} from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visão geral" };

const NOME_MES = (mes: string) => {
  const r = rotuloMes(mes).split(" de ")[0];
  return r.charAt(0).toUpperCase() + r.slice(1);
};

export default async function VisaoGeral({ searchParams }: PageProps<"/">) {
  const { supabase } = await exigirUsuario();
  const sp = await searchParams;
  const hoje = hojeEm();
  const pedido = typeof sp.mes === "string" ? sp.mes : "";
  const mes = ehMesISO(pedido) ? pedido : mesDe(hoje);
  const de = primeiroDia(mes);
  const fim = ultimoDia(mes);
  // "confirmado" vale até hoje; num mês que já acabou, até o último dia dele
  const ate = hoje < fim ? hoje : fim;

  const contas = await listarContas(supabase);
  const [lancamentos, cambios, config] = await Promise.all([
    listarLancamentos(supabase, { ate: fim }),
    listarCambios(supabase, contas),
    lerConfig(supabase),
  ]);

  // ---- tudo abaixo é cálculo puro (src/lib/dominio) ----
  const dias = diasDoFluxo(mes, hoje);
  const resumos: ContaResumo[] = contas.map((c) => {
    const s = saldoDaConta(c, lancamentos, cambios, ate, fim);
    return {
      id: c.id,
      nome: c.nome,
      moeda: c.moeda,
      confirmado: s.confirmado.centavos,
      noFim: s.noFim.centavos,
      fluxo: fluxoDaConta(c, lancamentos, cambios, dias, hoje),
    };
  });

  const referencia: Taxa = {
    tipo: "referencia",
    bsPorReal: config.cambioReferencia,
    data: config.cambioReferenciaData,
  };
  const resultado = resultadoDoMes(lancamentos, de, fim, referencia);
  const rateio = rateioDoMes(lancamentos, de, fim, referencia, config.rateioEscritorio);
  const aPagar = pendentes(lancamentos, "despesa", fim);
  const aReceber = pendentes(lancamentos, "receita", fim);
  const ultimos = lancamentos.filter((l) => l.data >= de && l.data <= ate).slice(0, 8);

  const nomeDe = new Map(contas.map((c) => [c.id, c.nome]));
  const nomeConta = (id: string) => nomeDe.get(id) ?? "—";
  const rotuloFim = mes === mesDe(hoje) ? "No fim do mês" : `Em ${formatarData(fim).slice(0, 5)}`;

  // caixa por moeda no fim do mês, para o veredito (nunca somado entre moedas)
  const caixaFim = totaisPorMoeda(
    resumos.map((r): Dinheiro => ({ centavos: r.noFim, moeda: r.moeda })),
  );
  const moedasNegativas = MOEDAS.filter(
    (m) => contas.some((c) => c.moeda === m) && caixaFim[m].centavos < 0,
  );

  return (
    <>
      <Cabecalho titulo="Visão geral" descricao={rotuloMes(mes)}>
        <div className="md:hidden">
          <Suspense>
            <NavegadorMes />
          </Suspense>
        </div>
      </Cabecalho>

      <Veredito
        nomeMes={NOME_MES(mes)}
        resultado={resultado.resultado}
        taxa={referencia}
        semLancamentos={resultado.receitas.emReais.centavos === 0 && resultado.despesas.emReais.centavos === 0}
        negativas={moedasNegativas.map((m) => ({ moeda: m, valor: caixaFim[m] }))}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-4">
          <CartaoSaldos contas={resumos} rotuloFim={rotuloFim} />
          <CartaoFluxo contas={resumos} rotuloFim={rotuloFim} />
        </div>
        <div className="grid content-start gap-4">
          <CartaoPendentes tipo="despesa" itens={aPagar} hoje={hoje} mes={mes} nomeConta={nomeConta} />
          <CartaoPendentes tipo="receita" itens={aReceber} hoje={hoje} mes={mes} nomeConta={nomeConta} />
        </div>
        <div className="grid content-start gap-4">
          <CartaoResultado r={resultado} rateio={rateio} />
          <CartaoUltimos itens={ultimos} nomeConta={nomeConta} />
        </div>
      </div>
    </>
  );
}

/** A frase acima da grade: o mês fecha ou não, e por quanto. */
function Veredito({
  nomeMes,
  resultado,
  taxa,
  semLancamentos,
  negativas,
}: {
  nomeMes: string;
  resultado: Dinheiro;
  taxa: Taxa;
  semLancamentos: boolean;
  negativas: { moeda: (typeof MOEDAS)[number]; valor: Dinheiro }[];
}) {
  if (semLancamentos) {
    return <p className="mb-5 text-lg text-muted-foreground">{nomeMes} ainda não tem receitas nem despesas lançadas.</p>;
  }
  const fecha = resultado.centavos >= 0;
  const abs = { ...resultado, centavos: Math.abs(resultado.centavos) };
  return (
    <div className="mb-5">
      <p className="text-lg font-medium sm:text-xl">
        {fecha ? (
          <>
            {nomeMes} fecha, com sobra de <span className="num text-positivo">{formatar(abs)}</span>.
          </>
        ) : (
          <>
            {nomeMes} não fecha: faltam <span className="num text-negativo">{formatar(abs)}</span>.
          </>
        )}
        {negativas.length > 0 && (
          <span className="text-muted-foreground">
            {" "}
            O caixa em{" "}
            {negativas.map((n, i) => (
              <span key={n.moeda}>
                {i > 0 && " e em "}
                {NOME_MOEDA[n.moeda].toLowerCase()} termina em <span className="num text-negativo">{formatar(n.valor)}</span>
              </span>
            ))}
            .
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Resultado em real ao câmbio de referência de {formatarTaxa(taxa.bsPorReal)}
        {taxa.data ? `, de ${formatarData(taxa.data)}` : ""}. Os saldos não usam taxa nenhuma.
      </p>
    </div>
  );
}
