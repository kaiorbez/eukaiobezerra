"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import type { EstadoForm } from "@/lib/acoes/erros";
import { salvarCategoria } from "./actions";

export function FormularioCategoria({
  id,
  inicial,
  grupos,
}: {
  id: string | null;
  inicial?: { nome: string; grupo: string };
  grupos: string[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarCategoria.bind(null, id), {});
  const ref = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};
  useEffect(() => {
    if (estado.ok && !id) ref.current?.reset();
  }, [estado, id]);

  return (
    <form ref={ref} action={acao} className="grid gap-4">
      <Campo rotulo="Nome" htmlFor="nome" erro={e.nome}>
        <Input id="nome" name="nome" defaultValue={inicial?.nome} placeholder="Ex.: Mercado" required />
      </Campo>
      <Campo rotulo="Grupo do relatório" htmlFor="grupo" erro={e.grupo} dica="Escolha um existente ou digite um novo">
        <Input id="grupo" name="grupo" list="grupos" defaultValue={inicial?.grupo} placeholder="Ex.: Vida" required />
        <datalist id="grupos">
          {grupos.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </Campo>
      {estado.erro && <p className="text-sm text-negativo">{estado.erro}</p>}
      <div className="flex justify-end gap-2">
        {id && (
          <Link href="/categorias" className={buttonVariants({ variant: "ghost" })}>
            Cancelar
          </Link>
        )}
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : id ? "Salvar" : "Criar categoria"}
        </Button>
      </div>
    </form>
  );
}
