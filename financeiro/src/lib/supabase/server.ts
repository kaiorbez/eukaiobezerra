import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { supabaseEnv } from "./env";

export async function criarClienteServidor() {
  const { url, key } = supabaseEnv();
  const loja = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll(lista) {
        try {
          for (const { name, value, options } of lista) loja.set(name, value, options);
        } catch {
          // Server Component não grava cookie; o proxy renova a sessão.
        }
      },
    },
  });
}

/** Cliente + id do usuário logado. Sem sessão válida, manda para o login. */
export async function exigirUsuario() {
  // tudo que vem depois (inclusive a data de hoje) é calculado na hora da requisição
  await connection();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId, email: (data.claims.email as string | undefined) ?? null };
}
