import type { Moeda } from "@/lib/dominio";

/** O que o servidor manda para os cartões interativos (tudo serializável). */
export interface ContaResumo {
  id: string;
  nome: string;
  moeda: Moeda;
  confirmado: number; // centavos
  noFim: number; // centavos
  fluxo: { data: string; centavos: number }[];
}
