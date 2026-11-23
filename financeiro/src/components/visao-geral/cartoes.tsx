import { ThumbsUp } from "lucide-react";
import Link from "next/link";
import { Valor } from "@/components/valor";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lancamento } from "@/lib/dados";
import {
  type DecisaoDeTroca,
  MOEDAS,
  NOME_MOEDA,
  type Rateio,
  type ResultadoDoMes,
  efeito,
  formatarData,
  formatarDataCurta,
  formatarTaxa,
  totaisPorMoeda,
} from "@/lib/dominio";
import { cn } from "@/lib/utils";
import { BotaoPagar } from "./botao-pagar";

const MOSTRAR = 6;

/** Contas a pagar / a receber: valor na moeda cobrada, total POR MOEDA. */
export function CartaoPendentes({
  tipo,
  itens,
  hoje,
  mes,
  nomeConta,
}: {
  tipo: "despesa" | "receita";
  itens: Lancamento[];
  hoje: string;
  mes: string;
  nomeConta: (id: string) => string;
}) {
  const titulo = tipo === "despesa" ? "Contas a pagar" : "Contas a receber";
  const totais = totaisPorMoeda(itens.map((l) => l.valor));
  const verTodas = `/lancamentos?mes=${mes}&status=previsto`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      {itens.length === 0 ? (
        <CardContent className="grid justify-items-center gap-3 py-6 text-center">
          <ThumbsUp className="size-9 text-muted-foreground" />
          <p className="text-sm font-medium">{tipo === "despesa" ? "Nenhuma conta a pagar." : "Nenhuma conta a receber."}</p>
          <p className="text-sm text-muted-foreground">
            {tipo === "despesa"
              ? "Contas a pagar são despesas previstas que ainda não foram pagas."
              : "Contas a receber são receitas previstas que ainda não caíram."}
          </p>
          <Link href={`/lancamentos/novo?tipo=${tipo}`} className={buttonVariants({ size: "sm" })}>
            {tipo === "despesa" ? "Incluir despesa" : "Incluir receita"}
          </Link>
        </CardContent>
      ) : (
        <>
          <ul className="text-sm">
            {itens.slice(0, MOSTRAR).map((l) => {
              const quando = l.venceEm ?? l.data;
              const atrasado = quando < hoje;
              return (
                <li key={l.id} className="flex items-center gap-3 border-t px-5 py-2">
                  <span className={cn("w-12 shrink-0 text-xs", atrasado ? "text-negativo" : "text-muted-foreground")}>
                    {formatarDataCurta(quando)}
                  </span>
                  <Link href={`/lancamentos/${l.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate">{l.descricao}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nomeConta(l.contaId)}
                      {atrasado && " · atrasado"}
                    </p>
                  </Link>
                  <Valor v={l.valor} colorir={false} />
                  <BotaoPagar id={l.id} tipo={tipo} />
                </li>
              );
            })}
          </ul>
          {itens.length > MOSTRAR && (
            <Link href={verTodas} className="block border-t px-5 py-2 text-xs text-primary hover:underline">
              e mais {itens.length - MOSTRAR}…
            </Link>
          )}
          <div className="border-t px-5 py-2 text-sm">
            {MOEDAS.filter((m) => totais[m].centavos !== 0).map((m) => (
              <div key={m} className="flex justify-between py-0.5 font-semibold">
                <span>Total em {NOME_MOEDA[m].toLowerCase()}</span>
                <Valor v={totais[m]} colorir={false} />
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/** Resultado do mês: o único cartão que soma as moedas — e diz a taxa no rodapé. */
export function CartaoResultado({ r, rateio }: { r: ResultadoDoMes; rateio: Rateio }) {
  const vazio = r.receitas.emReais.centavos === 0 && r.despesas.emReais.centavos === 0;
  // a composição nativa só aparece quando houve conversão (algo fora do real)
  const nativo = (c: ResultadoDoMes["receitas"]) =>
    c.nativo.BOB.centavos === 0
      ? null
      : MOEDAS.filter((m) => c.nativo[m].centavos !== 0).map((m) => (
      <Valor key={m} v={c.nativo[m]} colorir={false} className="text-xs text-muted-foreground" />
    ));

  return (
    <Card>
      <CardHeader className="gap-0">
        <CardTitle>Resultado do mês</CardTitle>
        <p className="text-xs text-muted-foreground italic">Situação projetada: pagos e previstos</p>
      </CardHeader>
      {vazio ? (
        <CardContent className="grid justify-items-center gap-3 py-6 text-center text-sm">
          <p className="font-medium">Sem receitas e despesas no mês.</p>
          <p className="text-muted-foreground">O resultado é apurado a partir das receitas e despesas lançadas.</p>
          <Link href="/lancamentos/novo" className={buttonVariants({ size: "sm" })}>
            Fazer lançamento
          </Link>
        </CardContent>
      ) : (
        <CardContent className="grid gap-3 text-sm">
          <div className="grid grid-cols-[1fr_auto] gap-y-1">
            <span>Receitas</span>
            <Valor v={r.receitas.emReais} colorir={false} className="text-right" />
            <span className="flex flex-wrap gap-x-2">{nativo(r.receitas)}</span>
            <span />
            <span>Despesas</span>
            <Valor v={{ ...r.despesas.emReais, centavos: -r.despesas.emReais.centavos }} className="text-right" />
            <span className="flex flex-wrap gap-x-2">{nativo(r.despesas)}</span>
            <span />
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <span className="font-semibold">Resultado</span>
            <Valor v={r.resultado} sinal className="text-lg font-semibold" />
          </div>
          {r.despesas.emReais.centavos > 0 && (
            <div className="grid gap-1 rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                Despesas por âmbito · casa rateada {fmtPct(rateio.percentualEmpresa)} para a empresa
              </p>
              <Barra empresa={rateio.empresa.centavos} total={rateio.total.centavos} />
              <div className="flex justify-between text-xs">
                <span>
                  Empresa <Valor v={rateio.empresa} colorir={false} />
                </span>
                <span>
                  Pessoal <Valor v={rateio.pessoal} colorir={false} />
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
      <CardFooter>
        Convertido ao câmbio de referência de {formatarTaxa(r.taxa.bsPorReal)}
        {r.taxa.data ? `, de ${formatarData(r.taxa.data)}` : ""}.
      </CardFooter>
    </Card>
  );
}

const fmtPct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

function Barra({ empresa, total }: { empresa: number; total: number }) {
  const p = total > 0 ? Math.max(0, Math.min(100, (empresa / total) * 100)) : 0;
  return (
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
      <div className="rounded-l-full bg-foreground/70" style={{ width: `${p}%` }} />
      <div className="flex-1 rounded-r-full bg-foreground/25" />
    </div>
  );
}

/** Os oito movimentos datados mais recentes, cada um na moeda cobrada. */
export function CartaoUltimos({
  itens,
  nomeConta,
}: {
  itens: Lancamento[];
  nomeConta: (id: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos lançamentos</CardTitle>
      </CardHeader>
      {itens.length === 0 ? (
        <CardContent className="grid justify-items-center gap-3 py-6 text-center text-sm text-muted-foreground">
          <p>Nada lançado neste mês até hoje.</p>
          <Link href="/lancamentos/novo" className={buttonVariants({ size: "sm" })}>
            Fazer lançamento
          </Link>
        </CardContent>
      ) : (
        <ul className="pb-1 text-sm">
          {itens.map((l) => (
            <li key={l.id} className="flex items-center gap-3 border-t px-5 py-2">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">{formatarDataCurta(l.data)}</span>
              <Link href={`/lancamentos/${l.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate">{l.descricao}</p>
                <p className="truncate text-xs text-muted-foreground">{nomeConta(l.contaId)}</p>
              </Link>
              <div className="text-right">
                <Valor v={efeito(l)} sinal className={l.status === "previsto" ? "opacity-70" : undefined} />
                {l.status === "previsto" && (
                  <Badge variant="previsto" className="ml-1">
                    previsto
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Decisão de câmbio: quanto falta na moeda fraca e quanto custa comprar — ao câmbio EFETIVO. */
export function CartaoDecisao({ decisao, temContaBob }: { decisao: DecisaoDeTroca | null; temContaBob: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisão de câmbio</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {!temContaBob ? (
          <p className="text-muted-foreground">Sem conta em boliviano, não há o que trocar.</p>
        ) : !decisao ? (
          <>
            <p className="text-muted-foreground">
              Sem nenhuma troca registrada não há câmbio efetivo — e a decisão nunca usa a referência.
            </p>
            <Link href="/cambio" className={buttonVariants({ size: "sm", className: "justify-self-start" })}>
              Registrar troca
            </Link>
          </>
        ) : decisao.falta.centavos === 0 ? (
          <p>Não falta boliviano neste mês.</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-y-1">
              <span className="text-muted-foreground">Falta em boliviano</span>
              <Valor v={decisao.falta} colorir={false} className="text-right" />
              <span className="font-semibold">Custa em real</span>
              <Valor v={decisao.custo} colorir={false} className="text-right text-lg font-semibold" />
            </div>
            <Link href="/cambio" className={buttonVariants({ size: "sm", variant: "secondary", className: "justify-self-start" })}>
              Decidir e registrar
            </Link>
          </>
        )}
      </CardContent>
      {decisao && (
        <CardFooter>
          Ao câmbio efetivo de {formatarTaxa(decisao.taxa.bsPorReal)}, da troca de {formatarData(decisao.taxa.data)}.
        </CardFooter>
      )}
    </Card>
  );
}
