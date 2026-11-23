import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { Card, CardContent } from "@/components/ui/card";
import { buscarConta } from "@/lib/dados";
import { formatarNumero } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";
import { FormularioConta } from "../formulario";

export const metadata: Metadata = { title: "Editar conta" };

export default async function EditarConta({ params }: PageProps<"/contas/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await exigirUsuario();
  const conta = await buscarConta(supabase, id);
  if (!conta) notFound();

  const [l, c] = await Promise.all([
    supabase.from("lancamento").select("id", { count: "exact", head: true }).eq("conta_id", id),
    supabase
      .from("cambio")
      .select("id", { count: "exact", head: true })
      .or(`conta_origem_id.eq.${id},conta_destino_id.eq.${id}`),
  ]);
  const travada = (l.count ?? 0) + (c.count ?? 0) > 0;

  return (
    <div className="mx-auto max-w-lg">
      <Cabecalho titulo="Editar conta" />
      <Card>
        <CardContent className="pt-5">
          <FormularioConta
            id={conta.id}
            moedaTravada={travada}
            inicial={{
              nome: conta.nome,
              moeda: conta.moeda,
              tipo: conta.tipo,
              saldoInicial: formatarNumero(conta.saldoInicial.centavos),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
