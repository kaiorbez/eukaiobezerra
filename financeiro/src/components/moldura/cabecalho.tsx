import type * as React from "react";

export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
