import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavegadorMes } from "@/components/moldura/navegador-mes";
import { ListaNavegacao, Navegacao } from "@/components/moldura/navegacao";
import { sair } from "@/app/login/actions";

export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-20">
      {/* barra estreita à esquerda: mês, navegação, sair */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-20 flex-col items-center gap-4 border-r bg-card/60 py-4 md:flex">
        <Link href="/lancamentos" className="text-lg font-bold text-primary" title="Financeiro">
          R$·Bs
        </Link>
        <Suspense fallback={<div className="h-28" />}>
          <NavegadorMes vertical />
        </Suspense>
        <div className="h-px w-10 bg-border" />
        <Suspense fallback={<ListaNavegacao modo="lateral" caminho={null} />}>
          <Navegacao modo="lateral" />
        </Suspense>
        <form action={sair} className="mt-auto">
          <button
            type="submit"
            title="Sair"
            className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </aside>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 md:px-8 md:pt-8">{children}</main>

      {/* no celular, a navegação desce para a base */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <Suspense fallback={<ListaNavegacao modo="inferior" caminho={null} />}>
          <Navegacao modo="inferior" />
        </Suspense>
      </div>

      {/* botão flutuante: novo lançamento */}
      <Link
        href="/lancamentos/novo"
        aria-label="Novo lançamento"
        className="fixed right-5 bottom-20 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/40 transition-transform hover:scale-105 md:bottom-8 md:right-8"
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
