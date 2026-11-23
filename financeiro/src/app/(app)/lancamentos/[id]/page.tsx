import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { Card, CardContent } from "@/components/ui/card";
import { buscarLancamento, listarCategorias, listarContas } from "@/lib/dados";
import { formatarNumero, mesDe } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";
import { FormularioLancamento } from "../formulario";
import { ExcluirLancamento } from "./excluir";

export const metadata: Metadata = { title: "Editar lançamento" };

export default async function EditarLancamento({ params }: PageProps<"/lancamentos/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirUsuario();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [l, contas, categorias] = await Promise.all([
    buscarLancamento(supabase, id),
    listarContas(supabase),
    listarCategorias(supabase),
  ]);
  if (!l) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Cabecalho titulo="Editar lançamento">
        <ExcluirLancamento id={l.id} mes={mesDe(l.data)} descricao={l.descricao} />
      </Cabecalho>
      <Card>
        <CardContent className="pt-5">
          <FormularioLancamento
            id={l.id}
            contas={contas}
            categorias={categorias}
            inicial={{
              tipo: l.tipo,
              data: l.data,
              descricao: l.descricao,
              valor: formatarNumero(l.valor.centavos),
              contaId: l.contaId,
              categoriaId: l.categoriaId ?? "",
              ambito: l.ambito,
              status: l.status,
              venceEm: l.venceEm ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
