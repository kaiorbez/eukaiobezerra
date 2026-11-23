import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { Valor } from "@/components/valor";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { lerConfig, listarCambios, listarContas, listarLancamentos } from "@/lib/dados";
import {
  LIMITE_DIVERGENCIA,
  type Taxa,
  diferencaContraReferencia,
  divergencia,
  formatarData,
  formatarTaxa,
  hoje as hojeEm,
  mesDe,
  rotuloMes,
  saldoDaConta,
  ultimaTaxaEfetiva,
  ultimoDia,
} from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";
import { excluirCambio } from "./actions";
import { PainelCambio } from "./painel";

export const metadata: Metadata = { title: "Câmbio" };

const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" });

export default async function Cambio() {
  const { supabase } = await exigirUsuario();
  const hoje = hojeEm();
  const mes = mesDe(hoje);
  const fim = ultimoDia(mes);
  const contas = await listarContas(supabase);
  const [lancamentos, cambios, config] = await Promise.all([
    listarLancamentos(supabase, { ate: fim }),
    listarCambios(supabase, contas),
    lerConfig(supabase),
  ]);

  // o que cada moeda tem no fim do mês — somado só dentro da mesma moeda
  const fimPor = { BRL: 0, BOB: 0 };
  for (const c of contas) fimPor[c.moeda] += saldoDaConta(c, lancamentos, cambios, hoje, fim).noFim.centavos;

  const ultima = ultimaTaxaEfetiva(cambios);
  const referencia: Taxa = { tipo: "referencia", bsPorReal: config.cambioReferencia, data: config.cambioReferenciaData };
  const div = ultima ? divergencia(ultima.bsPorReal, referencia.bsPorReal) : 0;
  const nome = new Map(contas.map((c) => [c.id, c.nome]));

  return (
    <>
      <Cabecalho titulo="Câmbio" descricao="A única ponte entre as duas moedas." />

      {ultima && Math.abs(div) > LIMITE_DIVERGENCIA && (
        <p className="mb-4 flex items-start gap-2 rounded-md border border-aviso/40 bg-aviso/10 p-3 text-sm text-aviso">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          A última troca ({formatarTaxa(ultima.bsPorReal)}) diverge {pct.format(div)} da referência (
          {formatarTaxa(referencia.bsPorReal)}). O resultado do mês pode estar mentindo devagar: atualize a referência
          em Ajustes.
        </p>
      )}

      <PainelCambio
        hoje={hoje}
        rotuloMes={rotuloMes(mes)}
        fimBob={fimPor.BOB}
        fimBrl={fimPor.BRL}
        temContaBob={contas.some((c) => c.moeda === "BOB")}
        ultima={ultima}
        contas={contas.map((c) => ({ id: c.id, nome: c.nome, moeda: c.moeda }))}
      />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Trocas registradas</CardTitle>
          <CardDescription>
            A diferença mostra quanto cada troca rendeu a mais (ou a menos) do que o câmbio de referência supõe.
          </CardDescription>
        </CardHeader>
        {cambios.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted-foreground">
            Nenhuma troca ainda. A primeira define o câmbio efetivo usado na decisão de quanto trocar.
          </p>
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH className="pl-5">Data</TH>
                <TH>Saiu</TH>
                <TH>Entrou</TH>
                <TH className="text-right">Taxa efetiva</TH>
                <TH className="text-right">Diferença × referência</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {cambios.map((c) => {
                const d = diferencaContraReferencia(c, referencia);
                return (
                  <TR key={c.id}>
                    <TD className="pl-5 whitespace-nowrap">{formatarData(c.data)}</TD>
                    <TD>
                      <Valor v={c.valorOrigem} colorir={false} />
                      <p className="text-xs text-muted-foreground">{nome.get(c.contaOrigemId)}</p>
                    </TD>
                    <TD>
                      <Valor v={c.valorDestino} colorir={false} />
                      <p className="text-xs text-muted-foreground">{nome.get(c.contaDestinoId)}</p>
                    </TD>
                    <TD className="num text-right font-medium">{formatarTaxa(c.taxaEfetiva)}</TD>
                    <TD className="text-right">
                      <Valor v={d.emBolivianos} sinal />
                      <p className="text-xs text-muted-foreground">
                        ≈ <Valor v={d.emReais} sinal colorir={false} />
                      </p>
                    </TD>
                    <TD>
                      <BotaoExcluir rotulo={`a troca de ${formatarData(c.data)}`} acao={excluirCambio.bind(null, c.id)} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
        <CardFooter>
          Diferença calculada ao câmbio de referência de {formatarTaxa(referencia.bsPorReal)}
          {referencia.data ? `, de ${formatarData(referencia.data)}` : ""}. Não é gravada: muda se a referência mudar.
        </CardFooter>
      </Card>
    </>
  );
}
