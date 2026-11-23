"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoForm, mensagemDeErro } from "@/lib/acoes/erros";
import { exigirUsuario } from "@/lib/supabase/server";

const schema = z.object({
  nome: z.string().trim().min(1, "Dê um nome à categoria").max(60),
  grupo: z.string().trim().min(1, "Informe o grupo do relatório").max(60),
});

export async function salvarCategoria(id: string | null, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = schema.safeParse({ nome: String(form.get("nome") ?? ""), grupo: String(form.get("grupo") ?? "") });
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros };
  }
  const { supabase } = await exigirUsuario();
  const { error } = id
    ? await supabase.from("categoria").update(r.data).eq("id", id)
    : await supabase.from("categoria").insert(r.data);
  if (error) return { erro: mensagemDeErro(error) };
  revalidatePath("/categorias");
  if (id) redirect("/categorias");
  return { ok: true };
}

/** Apagar a categoria não apaga lançamentos: eles ficam sem categoria. */
export async function excluirCategoria(id: string): Promise<{ erro?: string }> {
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("categoria").delete().eq("id", id);
  if (error) return { erro: mensagemDeErro(error, "excluir") };
  revalidatePath("/categorias");
  return {};
}
