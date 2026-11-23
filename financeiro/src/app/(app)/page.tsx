import { redirect } from "next/navigation";

// A Visão geral chega na fase 2. Até lá, a casa é a lista de lançamentos.
export default function Inicio() {
  redirect("/lancamentos");
}
