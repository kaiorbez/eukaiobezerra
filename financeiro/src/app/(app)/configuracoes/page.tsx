import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lerConfig, listarCambios, listarContas } from "@/lib/dados";
import { LIMITE_DIVERGENCIA, divergencia, formatarData, formatarTaxa, hoje } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";
import { FormularioConfig } from "./formulario";

export const metadata: Metadata = { title: "Configurações" };

const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" });

export default async function Configuracoes() {
  const { supabase, email } = await exigirUsuario();
  const [config, contas] = await Promise.all([lerConfig(supabase), listarContas(supabase)]);
  const ultimo = (await listarCambios(supabase, contas))[0];
  const div = ultimo ? divergencia(ultimo.taxaEfetiva, config.cambioReferencia) : 0;

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Cabecalho titulo="Configurações" descricao={email ?? undefined} />
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do cálculo</CardTitle>
          <CardDescription>
            Mudar estes números altera conversões e rateios — nunca o saldo de uma conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioConfig
            inicial={{
              cambioReferencia: config.cambioReferencia.toLocaleString("pt-BR", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 6,
              }),
              cambioReferenciaData: config.cambioReferenciaData || hoje(),
              rateio: config.rateioEscritorio.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
            }}
          />
        </CardContent>
      </Card>

      <Link
        href="/categorias"
        className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 text-sm font-medium hover:bg-muted/40"
      >
        Categorias
        <span className="text-muted-foreground">→</span>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Câmbio efetivo</CardTitle>
          <CardDescription>Vem da última operação de câmbio registrada. É o que decide quanto trocar.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {ultimo ? (
            <div className="grid gap-2">
              <p>
                <span className="num text-lg font-semibold">{formatarTaxa(ultimo.taxaEfetiva)}</span>{" "}
                <span className="text-muted-foreground">em {formatarData(ultimo.data)}</span>
              </p>
              <p className="text-muted-foreground">
                Referência: {formatarTaxa(config.cambioReferencia)} desde {formatarData(config.cambioReferenciaData)} ·
                diferença {pct.format(div)}
              </p>
              {Math.abs(div) > LIMITE_DIVERGENCIA && (
                <p className="flex items-start gap-2 rounded-md border border-aviso/40 bg-aviso/10 p-3 text-aviso">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />A última troca diverge mais de 3% da referência. O
                  resultado do mês pode estar mentindo devagar: atualize a referência.
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nenhuma troca registrada ainda. Registre em Câmbio.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
