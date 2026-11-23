import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { NavegadorMes } from "@/components/moldura/navegador-mes";
import { Valor } from "@/components/valor";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type FiltroLancamentos, listarCategorias, listarContas, listarLancamentos } from "@/lib/dados";
import {
  MOEDAS,
  type Moeda,
  dinheiro,
  efeito,
  ehMesISO,
  ehMoeda,
  formatarDataCurta,
  hoje,
  mesDe,
  primeiroDia,
  rotuloMes,
  somarTodos,
  ultimoDia,
} from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";
import { AcoesLinha } from "./acoes-linha";
import { Filtros } from "./filtros";

export const metadata: Metadata = { title: "Lançamentos" };

const AMBITO = { empresa: "Empresa", pessoal: "Pessoal", casa: "Casa" } as const;
const um = (x: string | string[] | undefined) => (typeof x === "string" && x ? x : undefined);

export default async function Lancamentos({ searchParams }: PageProps<"/lancamentos">) {
  const { supabase } = await exigirUsuario();
  const sp = await searchParams;
  const mesPedido = um(sp.mes);
  const mes = mesPedido && ehMesISO(mesPedido) ? mesPedido : mesDe(hoje());

  const moedaPedida = um(sp.moeda);
  const ambito = um(sp.ambito);
  const status = um(sp.status);
  const filtro: FiltroLancamentos = {
    de: primeiroDia(mes),
    ate: ultimoDia(mes),
    contaId: um(sp.conta),
    categoriaId: um(sp.categoria),
    moeda: moedaPedida && ehMoeda(moedaPedida) ? moedaPedida : undefined,
    ambito: ambito === "empresa" || ambito === "pessoal" || ambito === "casa" ? ambito : undefined,
    status: status === "pago" || status === "previsto" ? status : undefined,
  };
  // ids inválidos viram "sem filtro" em vez de erro do banco
  if (filtro.contaId && !/^[0-9a-f-]{36}$/i.test(filtro.contaId)) filtro.contaId = undefined;
  if (filtro.categoriaId && !/^[0-9a-f-]{36}$/i.test(filtro.categoriaId)) filtro.categoriaId = undefined;

  const [lancamentos, contas, categorias] = await Promise.all([
    listarLancamentos(supabase, filtro),
    listarContas(supabase),
    listarCategorias(supabase),
  ]);
  const contaPorId = new Map(contas.map((c) => [c.id, c]));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));

  // resumo do mês, uma coluna por moeda, nunca somadas
  const moedasPresentes = MOEDAS.filter((m) => lancamentos.some((l) => l.valor.moeda === m));
  const resumo = (m: Moeda) => {
    const daMoeda = lancamentos.filter((l) => l.valor.moeda === m);
    const receitas = somarTodos(m, daMoeda.filter((l) => l.tipo === "receita").map((l) => l.valor));
    const despesas = somarTodos(m, daMoeda.filter((l) => l.tipo === "despesa").map((l) => l.valor));
    const liquido = somarTodos(m, daMoeda.map(efeito));
    return { receitas, despesas: dinheiro(-despesas.centavos, m), liquido, n: daMoeda.length };
  };

  return (
    <>
      <Cabecalho titulo="Lançamentos" descricao={rotuloMes(mes)}>
        <div className="md:hidden">
          <Suspense>
            <NavegadorMes />
          </Suspense>
        </div>
      </Cabecalho>

      <div className="mb-4">
        <Suspense>
          <Filtros contas={contas} categorias={categorias} />
        </Suspense>
      </div>

      {moedasPresentes.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {moedasPresentes.map((m) => {
            const r = resumo(m);
            return (
              <Card key={m}>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">
                    Em {m === "BRL" ? "real" : "boliviano"}{" "}
                    <Badge variant={m} className="ml-1">
                      {m}
                    </Badge>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {r.n} {r.n === 1 ? "lançamento" : "lançamentos"}
                  </span>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Receitas</p>
                    <Valor v={r.receitas} colorir={false} className="text-positivo" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <Valor v={r.despesas} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Líquido</p>
                    <Valor v={r.liquido} sinal className="font-semibold" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        {lancamentos.length === 0 ? (
          <CardContent className="grid justify-items-center gap-3 py-10 text-center">
            <p className="font-medium">Nenhum lançamento em {rotuloMes(mes)}.</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {contas.length === 0
                ? "Comece criando uma conta: é ela que define a moeda de cada lançamento."
                : "Lançamentos são receitas e despesas, cada uma gravada na moeda em que foi cobrada."}
            </p>
            {contas.length === 0 ? (
              <Link href="/contas" className={buttonVariants()}>
                Criar conta
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/lancamentos/novo?tipo=despesa" className={buttonVariants()}>
                  Incluir despesa
                </Link>
                <Link href="/lancamentos/novo?tipo=receita" className={buttonVariants({ variant: "outline" })}>
                  Incluir receita
                </Link>
              </div>
            )}
          </CardContent>
        ) : (
          <ul className="divide-y">
            {lancamentos.map((l) => {
              const conta = contaPorId.get(l.contaId);
              const cat = l.categoriaId ? categoriaPorId.get(l.categoriaId) : undefined;
              return (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                  <span className="hidden w-12 shrink-0 text-xs text-muted-foreground sm:block">
                    {formatarDataCurta(l.data)}
                  </span>
                  <Link href={`/lancamentos/${l.id}`} className="min-w-0 flex-1 sm:pointer-events-none">
                    <p className="truncate text-sm font-medium">{l.descricao}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                      <span className="sm:hidden">{formatarDataCurta(l.data)} ·</span>
                      <span>{conta?.nome ?? "—"}</span>
                      {cat && <span>· {cat.nome}</span>}
                      <span>· {AMBITO[l.ambito]}</span>
                      {l.status === "previsto" && (
                        <Badge variant="previsto">
                          previsto{l.venceEm ? ` · vence ${formatarDataCurta(l.venceEm)}` : ""}
                        </Badge>
                      )}
                    </p>
                  </Link>
                  <div className="shrink-0 text-right">
                    <Valor
                      v={efeito(l)}
                      sinal
                      className={l.status === "previsto" ? "opacity-70" : "font-medium"}
                    />
                    <p className="text-[10px] text-muted-foreground">{l.valor.moeda}</p>
                  </div>
                  <div className="hidden sm:block">
                    <AcoesLinha id={l.id} status={l.status} descricao={l.descricao} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
