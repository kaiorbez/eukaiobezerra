"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoForm, mensagemDeErro } from "@/lib/acoes/erros";
import { MOEDAS, centavosDeEntrada, decimalDeCentavos } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";

const schema = z.object({
  nome: z.string().trim().min(1, "Dê um nome à conta").max(80),
  moeda: z.enum(MOEDAS, "Escolha a moeda"),
  tipo: z.enum(["banco", "dinheiro"]),
  saldo_inicial: z
    .string()
    .transform((s) => (s.trim() === "" ? 0 : centavosDeEntrada(s)))
    .refine((c): c is number => c !== null, "Valor inválido. Use 1.234,56"),
});

export async function salvarConta(id: string | null, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = schema.safeParse({
    nome: String(form.get("nome") ?? ""),
    moeda: String(form.get("moeda") ?? ""),
    tipo: String(form.get("tipo") ?? "banco"),
    saldo_inicial: String(form.get("saldo_inicial") ?? ""),
  });
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros };
  }
  const { supabase } = await exigirUsuario();
  const linha = { ...r.data, saldo_inicial: decimalDeCentavos(r.data.saldo_inicial) };
  const { error } = id
    ? await supabase.from("conta").update(linha).eq("id", id)
    : await supabase.from("conta").insert(linha);
  if (error) return { erro: mensagemDeErro(error) };

  revalidatePath("/contas");
  revalidatePath("/lancamentos");
  if (id) redirect("/contas");
  return { ok: true };
}

export async function excluirConta(id: string): Promise<{ erro?: string }> {
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("conta").delete().eq("id", id);
  if (error) return { erro: mensagemDeErro(error, "excluir") };
  revalidatePath("/contas");
  return {};
}
