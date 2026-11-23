import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Financeiro</CardTitle>
          <CardDescription>Real e boliviano, cada moeda no seu caixa.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioLogin erroLink={erro === "link"} />
        </CardContent>
      </Card>
    </main>
  );
}
