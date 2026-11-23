import { type Dinheiro, formatar } from "@/lib/dominio";
import { cn } from "@/lib/utils";

/** Valor sempre com o símbolo da própria moeda. Cor pelo sinal. */
export function Valor({
  v,
  sinal,
  colorir = true,
  className,
}: {
  v: Dinheiro;
  sinal?: boolean;
  colorir?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "num",
        colorir && v.centavos < 0 && "text-negativo",
        colorir && sinal && v.centavos > 0 && "text-positivo",
        className,
      )}
    >
      {formatar(v, { sinal })}
    </span>
  );
}
