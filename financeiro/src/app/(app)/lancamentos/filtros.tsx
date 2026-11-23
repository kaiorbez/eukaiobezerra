"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

interface Props {
  contas: { id: string; nome: string; moeda: string }[];
  categorias: { id: string; nome: string }[];
}

const FILTROS = ["conta", "moeda", "categoria", "ambito", "status"] as const;

/** Filtros da lista: cada mudança vira query string, então a URL é compartilhável. */
export function Filtros({ contas, categorias }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const mudar = (chave: string, valor: string) => {
    const q = new URLSearchParams(params);
    if (valor) q.set(chave, valor);
    else q.delete(chave);
    router.replace(`/lancamentos?${q.toString()}`, { scroll: false });
  };
  const v = (k: string) => params.get(k) ?? "";
  const algum = FILTROS.some((k) => params.get(k));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Select aria-label="Conta" value={v("conta")} onChange={(e) => mudar("conta", e.target.value)}>
        <option value="">Contas</option>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome} · {c.moeda}
          </option>
        ))}
      </Select>
      <Select aria-label="Moeda" value={v("moeda")} onChange={(e) => mudar("moeda", e.target.value)}>
        <option value="">Real e boliviano</option>
        <option value="BRL">Só real (R$)</option>
        <option value="BOB">Só boliviano (Bs)</option>
      </Select>
      <Select aria-label="Categoria" value={v("categoria")} onChange={(e) => mudar("categoria", e.target.value)}>
        <option value="">Categorias</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Select>
      <Select aria-label="Âmbito" value={v("ambito")} onChange={(e) => mudar("ambito", e.target.value)}>
        <option value="">Âmbito</option>
        <option value="empresa">Empresa</option>
        <option value="pessoal">Pessoal</option>
        <option value="casa">Casa</option>
      </Select>
      <Select aria-label="Status" value={v("status")} onChange={(e) => mudar("status", e.target.value)}>
        <option value="">Pago e previsto</option>
        <option value="pago">Só pago</option>
        <option value="previsto">Só previsto</option>
      </Select>
      <button
        type="button"
        disabled={!algum}
        onClick={() => {
          const q = new URLSearchParams();
          const mes = params.get("mes");
          if (mes) q.set("mes", mes);
          router.replace(`/lancamentos?${q.toString()}`, { scroll: false });
        }}
        className="h-9 rounded-md text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        Limpar filtros
      </button>
    </div>
  );
}
