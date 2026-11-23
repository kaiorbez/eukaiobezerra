"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoForm, mensagemDeErro } from "@/lib/acoes/erros";
import { ehDataISO, taxaDeEntrada } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/supabase/server";

const schema = z.object({
  cambio_referencia: z
    .string()
    .transform(taxaDeEntrada)
    .refine((t): t is number => t !== null, "Use um número como 2,000 (bolivianos por real)"),
  cambio_referencia_data: z.string().refine(ehDataISO, "Data inválida"),
  rateio_escritorio: z
    .string()
    .transform((s) => Number(s.trim().replace(",", ".").replace("%", "")))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 100, "Entre 0 e 100"),
});

export async function salvarConfig(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = schema.safeParse({
    cambio_referencia: String(form.get("cambio_referencia") ?? ""),
    cambio_referencia_data: String(form.get("cambio_referencia_data") ?? ""),
    rateio_escritorio: String(form.get("rateio_escritorio") ?? ""),
  });
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros };
  }
  const { supabase, userId } = await exigirUsuario();
  const { error } = await supabase.from("config").upsert({
    user_id: userId,
    cambio_referencia: r.data.cambio_referencia.toFixed(6),
    cambio_referencia_data: r.data.cambio_referencia_data,
    rateio_escritorio: r.data.rateio_escritorio.toFixed(2),
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { erro: mensagemDeErro(error) };
  revalidatePath("/configuracoes");
  return { ok: true };
}
