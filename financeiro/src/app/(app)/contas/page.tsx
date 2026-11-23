import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { Valor } from "@/components/valor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TBody, TD, TFoot, TH, THead, TR, Table } from "@/components/ui/table";
import { listarCambios, listarContas, listarLancamentos } from "@/lib/dados";
import { MOEDAS, formatarData, hoje, mesDe, saldoDaConta, somarTodos, ultimoDia } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";
import { excluirConta } from "./actions";
import { FormularioConta } from "./formulario";

export const metadata: Metadata = { title: "Contas" };

export default async function Contas() {
  const { supabase } = await exigirUsuario();
  const contas = await listarContas(supabase);
  const [lancamentos, cambios] = await Promise.all([listarLancamentos(supabase), listarCambios(supabase, contas)]);

  const dia = hoje();
  const fim = ultimoDia(mesDe(dia));
  const linhas = contas.map((c) => ({ conta: c, saldo: saldoDaConta(c, lancamentos, cambios, dia, fim) }));

  return (
    <>
      <Cabecalho titulo="Contas" descricao="Cada conta tem uma moeda e fecha no seu próprio saldo." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Saldos de caixa</CardTitle>
            <CardDescription>Confirmado até hoje ({formatarData(dia)}) e previsto para o fim do mês.</CardDescription>
          </CardHeader>
          {contas.length === 0 ? (
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma conta ainda. Crie uma em real e uma em boliviano ao lado.
            </CardContent>
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH className="pl-5">Conta</TH>
                  <TH className="text-right">Confirmado</TH>
                  <TH className="text-right">No fim do mês</TH>
                  <TH className="w-20" />
                </TR>
              </THead>
              <TBody>
                {linhas.map(({ conta, saldo }) => (
                  <TR key={conta.id}>
                    <TD className="pl-5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{conta.nome}</span>
                        <Badge variant={conta.moeda}>{conta.moeda}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {conta.tipo === "banco" ? "Banco" : "Dinheiro"} · inicial{" "}
                        <Valor v={conta.saldoInicial} colorir={false} />
                      </p>
                    </TD>
                    <TD className="text-right">
                      <Valor v={saldo.confirmado} />
                    </TD>
                    <TD className="text-right">
                      <Valor v={saldo.noFim} />
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        <Link
                          href={`/contas/${conta.id}`}
                          title="Editar"
                          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <BotaoExcluir rotulo={`a conta ${conta.nome}`} acao={excluirConta.bind(null, conta.id)} />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
              <TFoot>
                {/* um total por moeda — nunca um total único somando as duas */}
                {MOEDAS.filter((m) => contas.some((c) => c.moeda === m)).map((m) => {
                  const daMoeda = linhas.filter((l) => l.conta.moeda === m);
                  return (
                    <TR key={m} className="hover:bg-transparent">
                      <TD className="pl-5">Total em {m === "BRL" ? "real" : "boliviano"}</TD>
                      <TD className="text-right">
                        <Valor v={somarTodos(m, daMoeda.map((l) => l.saldo.confirmado))} />
                      </TD>
                      <TD className="text-right">
                        <Valor v={somarTodos(m, daMoeda.map((l) => l.saldo.noFim))} />
                      </TD>
                      <TD />
                    </TR>
                  );
                })}
              </TFoot>
            </Table>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Nova conta</CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioConta id={null} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
