import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/moldura/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listarCategorias } from "@/lib/dados";
import { exigirUsuario } from "@/lib/supabase/server";
import { excluirCategoria } from "./actions";
import { FormularioCategoria } from "./formulario";

export const metadata: Metadata = { title: "Categorias" };

export default async function Categorias() {
  const { supabase } = await exigirUsuario();
  const categorias = await listarCategorias(supabase);
  const porGrupo = Object.groupBy(categorias, (c) => c.grupo);
  const grupos = Object.keys(porGrupo);

  return (
    <>
      <Cabecalho titulo="Categorias" descricao="O grupo é a linha em que a categoria aparece nos relatórios." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {grupos.length === 0 && (
            <Card className="sm:col-span-2">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma categoria. Crie a primeira ao lado.
              </CardContent>
            </Card>
          )}
          {grupos.map((g) => (
            <Card key={g}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">{g}</CardTitle>
              </CardHeader>
              <ul className="divide-y px-2 pb-2">
                {porGrupo[g]?.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-1 pl-3">
                    <span className="text-sm">{c.nome}</span>
                    <span className="flex">
                      <Link
                        href={`/categorias/${c.id}`}
                        title="Editar"
                        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <BotaoExcluir rotulo={`a categoria ${c.nome}`} acao={excluirCategoria.bind(null, c.id)} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Nova categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioCategoria id={null} grupos={grupos} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
