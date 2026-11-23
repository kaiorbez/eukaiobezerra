"use client";

import { ArrowLeftRight, Coins, Landmark, LayoutGrid, Settings, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  rotulo: string;
  icone: typeof Coins;
  /** só na barra lateral; no celular fica acessível por Ajustes */
  soLateral?: boolean;
}

const ITENS: Item[] = [
  { href: "/", rotulo: "Visão geral", icone: LayoutGrid },
  { href: "/lancamentos", rotulo: "Lançamentos", icone: ArrowLeftRight },
  { href: "/cambio", rotulo: "Câmbio", icone: Coins },
  { href: "/contas", rotulo: "Contas", icone: Landmark },
  { href: "/categorias", rotulo: "Categorias", icone: Tags, soLateral: true },
  { href: "/configuracoes", rotulo: "Ajustes", icone: Settings },
];

type Modo = "lateral" | "inferior";

/** A lista de links; `caminho` nulo = sem item ativo (usado como fallback estático). */
export function ListaNavegacao({ modo, caminho }: { modo: Modo; caminho: string | null }) {
  return (
    <nav className={cn(modo === "lateral" ? "flex flex-col gap-1" : "grid grid-cols-5")}>
      {ITENS.filter((i) => modo === "lateral" || !i.soLateral).map(({ href, rotulo, icone: Icone }) => {
        const ativo = caminho == null ? false : href === "/" ? caminho === "/" : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground",
              modo === "lateral" && "hover:bg-muted",
              ativo && "text-foreground",
              ativo && modo === "lateral" && "bg-muted",
            )}
          >
            <Icone className={cn("size-5", ativo && "text-primary")} />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

export function Navegacao({ modo }: { modo: Modo }) {
  return <ListaNavegacao modo={modo} caminho={usePathname()} />;
}
