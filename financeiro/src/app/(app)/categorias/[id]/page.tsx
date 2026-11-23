import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { Card, CardContent } from "@/components/ui/card";
import { listarCategorias } from "@/lib/dados";
import { exigirUsuario } from "@/lib/supabase/server";
import { FormularioCategoria } from "../formulario";

export const metadata: Metadata = { title: "Editar categoria" };

export default async function EditarCategoria({ params }: PageProps<"/categorias/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirUsuario();
  const categorias = await listarCategorias(supabase);
  const c = categorias.find((x) => x.id === id);
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-lg">
      <Cabecalho titulo="Editar categoria" />
      <Card>
        <CardContent className="pt-5">
          <FormularioCategoria
            id={c.id}
            inicial={{ nome: c.nome, grupo: c.grupo }}
            grupos={[...new Set(categorias.map((x) => x.grupo))]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
