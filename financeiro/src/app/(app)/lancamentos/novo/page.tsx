import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listarCategorias, listarContas } from "@/lib/dados";
import { hoje } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";
import { FormularioLancamento } from "../formulario";

export const metadata: Metadata = { title: "Novo lançamento" };

export default async function NovoLancamento({ searchParams }: PageProps<"/lancamentos/novo">) {
  const { supabase } = await exigirUsuario();
  const sp = await searchParams;
  const [contas, categorias] = await Promise.all([listarContas(supabase), listarCategorias(supabase)]);
  const tipo = sp.tipo === "receita" ? "receita" : "despesa";
  const contaPedida = typeof sp.conta === "string" ? sp.conta : "";

  return (
    <div className="mx-auto max-w-2xl">
      <Cabecalho titulo="Novo lançamento" />
      {contas.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Todo lançamento pertence a uma conta, e é a conta que define a moeda. Crie a primeira conta para começar.
            </p>
            <Link href="/contas" className={buttonVariants()}>
              Criar conta
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-5">
            <FormularioLancamento
              id={null}
              contas={contas}
              categorias={categorias}
              inicial={{
                tipo,
                data: hoje(),
                descricao: "",
                valor: "",
                contaId: contas.some((c) => c.id === contaPedida) ? contaPedida : contas.length === 1 ? contas[0].id : "",
                categoriaId: "",
                ambito: "pessoal",
                status: "pago",
                venceEm: "",
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
