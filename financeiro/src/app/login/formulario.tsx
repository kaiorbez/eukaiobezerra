"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import { type EstadoLogin, autenticar } from "./actions";

export function FormularioLogin({ erroLink }: { erroLink: boolean }) {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(autenticar, {
    erro: erroLink ? "O link de confirmação expirou ou é inválido." : undefined,
  });

  return (
    <form action={acao} className="grid gap-4">
      <input type="hidden" name="modo" value={modo} />
      <Campo rotulo="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Campo>
      <Campo rotulo="Senha" htmlFor="senha">
        <Input
          id="senha"
          name="senha"
          type="password"
          minLength={8}
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
          required
        />
      </Campo>
      {estado.erro && <p className="text-sm text-negativo">{estado.erro}</p>}
      {estado.aviso && <p className="text-sm text-positivo">{estado.aviso}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
      </Button>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
      >
        {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
      </button>
    </form>
  );
}
