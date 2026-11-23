"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";

export interface EstadoLogin {
  erro?: string;
  aviso?: string;
}

const schema = z.object({
  email: z.email("E-mail inválido"),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
  modo: z.enum(["entrar", "criar"]),
});

export async function autenticar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const r = schema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: r.error.issues[0]?.message };
  const { email, senha, modo } = r.data;
  const supabase = await criarClienteServidor();

  if (modo === "criar") {
    const origem = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${origem}/auth/callback` },
    });
    if (error) return { erro: error.message };
    if (!data.session) return { aviso: "Conta criada. Confirme pelo link que chegou no seu e-mail." };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { erro: "E-mail ou senha incorretos." };
  }
  redirect("/");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
