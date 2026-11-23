"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoForm, mensagemDeErro } from "@/lib/acoes/erros";
import { centavosDeEntrada, decimalDeCentavos, ehDataISO, mesDe } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";

const data = z.string().refine(ehDataISO, "Data inválida");

const schema = z.object({
  tipo: z.enum(["receita", "despesa"], "Escolha receita ou despesa"),
  data,
  descricao: z.string().trim().min(1, "Descreva o lançamento").max(200),
  valor: z
    .string()
    .transform((s) => centavosDeEntrada(s))
    .refine((c): c is number => c !== null, "Valor inválido. Use 248,00 ou 1.234,56")
    .refine((c) => c > 0, "O valor precisa ser maior que zero (o sinal vem de receita/despesa)"),
  conta_id: z.uuid("Escolha a conta"),
  categoria_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
  ambito: z.enum(["empresa", "pessoal", "casa"]),
  status: z.enum(["previsto", "pago"]),
  vence_em: z.union([z.literal(""), data]).transform((v) => v || null),
});

function ler(form: FormData) {
  const bruto = Object.fromEntries(
    ["tipo", "data", "descricao", "valor", "conta_id", "categoria_id", "ambito", "status", "vence_em"].map(
      (k) => [k, String(form.get(k) ?? "")],
    ),
  );
  return schema.safeParse(bruto);
}

function errosDeCampo(e: z.ZodError): Record<string, string> {
  const r: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? "");
    if (k && !r[k]) r[k] = i.message;
  }
  return r;
}

/**
 * Grava o lançamento. A moeda NÃO é enviada: o banco a copia da conta escolhida,
 * o que torna impossível gravar um valor na moeda errada.
 */
export async function salvarLancamento(id: string | null, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = ler(form);
  if (!r.success) return { erros: errosDeCampo(r.error) };
  const v = r.data;
  const { supabase } = await exigirUsuario();

  const linha = {
    tipo: v.tipo,
    data: v.data,
    descricao: v.descricao,
    valor: decimalDeCentavos(v.valor),
    conta_id: v.conta_id,
    categoria_id: v.categoria_id,
    ambito: v.ambito,
    status: v.status,
    vence_em: v.vence_em,
  };

  const { error } = id
    ? await supabase.from("lancamento").update(linha).eq("id", id)
    : await supabase.from("lancamento").insert(linha);
  if (error) return { erro: mensagemDeErro(error) };

  revalidatePath("/lancamentos");
  revalidatePath("/contas");
  const mes = mesDe(v.data);
  redirect(`/lancamentos?mes=${mes}`);
}

export async function alternarStatus(id: string, novo: "pago" | "previsto") {
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("lancamento").update({ status: novo }).eq("id", id);
  if (error) throw new Error(mensagemDeErro(error));
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
}

export async function excluirLancamento(id: string) {
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("lancamento").delete().eq("id", id);
  if (error) throw new Error(mensagemDeErro(error, "excluir"));
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
}

export async function excluirLancamentoEVoltar(id: string, mes: string) {
  await excluirLancamento(id);
  redirect(`/lancamentos?mes=${mes}`);
}
