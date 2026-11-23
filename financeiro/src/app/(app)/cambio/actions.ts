"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoForm, mensagemDeErro } from "@/lib/acoes/erros";
import { centavosDeEntrada, decimalDeCentavos, ehDataISO } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";

const positivo = (rotulo: string) =>
  z
    .string()
    .transform((s) => centavosDeEntrada(s))
    .refine((c): c is number => c !== null, `${rotulo}: valor inválido. Use 3.200,00`)
    .refine((c) => c > 0, `${rotulo}: precisa ser maior que zero`);

const schema = z
  .object({
    data: z.string().refine(ehDataISO, "Data inválida"),
    conta_origem_id: z.uuid("Escolha de onde o dinheiro saiu"),
    valor_origem: positivo("Valor que saiu"),
    conta_destino_id: z.uuid("Escolha onde o dinheiro entrou"),
    valor_destino: positivo("Valor que entrou"),
  })
  .refine((v) => v.conta_origem_id !== v.conta_destino_id, {
    path: ["conta_destino_id"],
    message: "Origem e destino precisam ser contas diferentes",
  });

/**
 * Registra a troca. A taxa efetiva NÃO é enviada: o banco calcula
 * (valor que entrou ÷ valor que saiu) numa coluna gerada.
 */
export async function registrarCambio(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const campos = ["data", "conta_origem_id", "valor_origem", "conta_destino_id", "valor_destino"];
  const r = schema.safeParse(Object.fromEntries(campos.map((k) => [k, String(form.get(k) ?? "")])));
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros };
  }
  const v = r.data;
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("cambio").insert({
    data: v.data,
    conta_origem_id: v.conta_origem_id,
    valor_origem: decimalDeCentavos(v.valor_origem),
    conta_destino_id: v.conta_destino_id,
    valor_destino: decimalDeCentavos(v.valor_destino),
  });
  if (error) {
    if (error.code === "23514" && /moedas diferentes/.test(error.message)) {
      return { erros: { conta_destino_id: "Uma troca liga duas moedas diferentes." } };
    }
    return { erro: mensagemDeErro(error) };
  }
  for (const p of ["/cambio", "/", "/contas", "/configuracoes"]) revalidatePath(p);
  return { ok: true };
}

export async function excluirCambio(id: string): Promise<{ erro?: string }> {
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("cambio").delete().eq("id", id);
  if (error) return { erro: mensagemDeErro(error, "excluir") };
  for (const p of ["/cambio", "/", "/contas", "/configuracoes"]) revalidatePath(p);
  return {};
}
