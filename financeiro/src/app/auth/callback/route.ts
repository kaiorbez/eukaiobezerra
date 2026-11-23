import { type NextRequest, NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Volta do e-mail de confirmação do Supabase: troca o código pela sessão. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
  }
  return NextResponse.redirect(new URL("/login?erro=link", url.origin));
}
