"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Valor } from "@/components/valor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, Input, Select } from "@/components/ui/input";
import type { EstadoForm } from "@/lib/acoes/erros";
import {
  type Moeda,
  SIMBOLO,
  type Taxa,
  centavosDeEntrada,
  compararRotas,
  decidirTroca,
  dinheiro,
  formatar,
  formatarData,
  formatarNumero,
  formatarTaxa,
  taxaDeEntrada,
  taxaEfetiva,
} from "@/lib/dominio";
import { cn } from "@/lib/utils";
import { registrarCambio } from "./actions";

interface Props {
  hoje: string;
  rotuloMes: string;
  /** saldo previsto no fim do mês, somando as contas de cada moeda (nunca entre moedas) */
  fimBob: number;
  fimBrl: number;
  temContaBob: boolean;
  ultima: Taxa | null;
  contas: { id: string; nome: string; moeda: Moeda }[];
}

const numero = (n: number, casas = 4) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: Math.min(3, casas), maximumFractionDigits: casas });

export function PainelCambio({ hoje, rotuloMes, fimBob, fimBrl, temContaBob, ultima, contas }: Props) {
  // ---- decisão ----
  const [taxaTexto, setTaxaTexto] = useState(ultima ? numero(ultima.bsPorReal) : "");
  const [margemTexto, setMargemTexto] = useState("");
  const taxaDigitada = taxaDeEntrada(taxaTexto);
  // o campo mostra a taxa com 4 casas; igual a ela = "não mexeu", e vale a taxa gravada inteira
  const sobrescrita =
    ultima !== null && taxaDigitada !== null && Math.abs(taxaDigitada - Number(ultima.bsPorReal.toFixed(4))) > 1e-9;
  const taxa: Taxa | null =
    taxaDigitada === null
      ? null
      : ultima && !sobrescrita
        ? ultima
        : { tipo: "efetiva", bsPorReal: taxaDigitada, data: hoje };
  const margem = centavosDeEntrada(margemTexto) ?? 0;
  const decisao = taxa ? decidirTroca(dinheiro(fimBob, "BOB"), taxa, dinheiro(Math.max(0, margem), "BOB")) : null;

  // ---- registro (pré-preenchido pela decisão) ----
  const origemPadrao = contas.find((c) => c.moeda === "BRL")?.id ?? "";
  const destinoPadrao = contas.find((c) => c.moeda === "BOB")?.id ?? "";
  const [origem, setOrigem] = useState(origemPadrao);
  const [destino, setDestino] = useState(destinoPadrao);
  const [saiu, setSaiu] = useState("");
  const [entrou, setEntrou] = useState("");
  const moedaOrigem = contas.find((c) => c.id === origem)?.moeda;
  const moedaDestino = contas.find((c) => c.id === destino)?.moeda;
  const cSaiu = centavosDeEntrada(saiu);
  const cEntrou = centavosDeEntrada(entrou);
  let previa: number | null = null;
  if (moedaOrigem && moedaDestino && moedaOrigem !== moedaDestino && cSaiu && cEntrou && cSaiu > 0 && cEntrou > 0) {
    previa = taxaEfetiva(dinheiro(cSaiu, moedaOrigem), dinheiro(cEntrou, moedaDestino));
  }

  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(async (anterior, dados) => {
    const r = await registrarCambio(anterior, dados);
    if (r.ok) {
      setSaiu("");
      setEntrou("");
    }
    return r;
  }, {});
  const form = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  const usarNaTroca = (centavosReais: number) => {
    setOrigem(origemPadrao);
    setDestino(destinoPadrao);
    setSaiu(formatarNumero(centavosReais));
    form.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ------------------------------------------------------------ decisão */}
      <Card>
        <CardHeader>
          <CardTitle>Decisão de câmbio</CardTitle>
          <CardDescription>Quanto boliviano falta em {rotuloMes} e quanto custa comprar, ao câmbio que será pago.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Câmbio efetivo (Bs por R$)"
              htmlFor="taxa"
              dica={
                ultima
                  ? sobrescrita
                    ? `Informado por você. A última troca saiu a ${formatarTaxa(ultima.bsPorReal)}.`
                    : `Da última troca, em ${formatarData(ultima.data)}. Pode ajustar à cotação de hoje.`
                  : "Nenhuma troca registrada: informe a cotação que você vai pagar."
              }
            >
              <Input
                id="taxa"
                inputMode="decimal"
                value={taxaTexto}
                onChange={(ev) => setTaxaTexto(ev.target.value)}
                placeholder="2,048"
                className="num"
              />
            </Campo>
            <Campo rotulo="Margem de segurança (Bs)" htmlFor="margem" dica="Opcional. Soma ao que falta.">
              <Input
                id="margem"
                inputMode="decimal"
                value={margemTexto}
                onChange={(ev) => setMargemTexto(ev.target.value)}
                placeholder="0,00"
                className="num"
              />
            </Campo>
          </div>

          {!temContaBob ? (
            <p className="text-sm text-muted-foreground">Crie uma conta em boliviano para calcular o que falta.</p>
          ) : !decisao ? (
            <p className="text-sm text-muted-foreground">Informe o câmbio efetivo para calcular o custo.</p>
          ) : decisao.falta.centavos === 0 ? (
            <div className="rounded-md bg-muted/50 p-4 text-sm">
              <p className="font-medium">Não falta boliviano em {rotuloMes}.</p>
              <p className="text-muted-foreground">
                As contas em boliviano terminam o mês em <Valor v={dinheiro(fimBob, "BOB")} />.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <div className="grid grid-cols-[1fr_auto] gap-y-1">
                <span className="text-muted-foreground">Falta no fim do mês</span>
                <Valor v={decisao.falta} colorir={false} className="text-right" />
                {margem > 0 && (
                  <>
                    <span className="text-muted-foreground">Comprar, com a margem</span>
                    <Valor v={decisao.comprar} colorir={false} className="text-right" />
                  </>
                )}
              </div>
              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="font-semibold">Custo em real</span>
                <Valor v={decisao.custo} colorir={false} className="text-xl font-semibold" />
              </div>
              <p className="text-xs text-muted-foreground">
                Real no fim do mês depois da troca: <Valor v={dinheiro(fimBrl - decisao.custo.centavos, "BRL")} />
              </p>
              <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => usarNaTroca(decisao.custo.centavos)}>
                Registrar esta troca <ArrowRight />
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {decisao
            ? `Convertido ao câmbio efetivo de ${formatarTaxa(decisao.taxa.bsPorReal)}${sobrescrita || !ultima ? " (informado hoje)" : `, de ${formatarData(decisao.taxa.data)}`}. Nunca à referência.`
            : "A decisão de troca usa só o câmbio efetivo."}
        </CardFooter>
      </Card>

      {/* --------------------------------------------------------- comparador */}
      <Comparador
        sugestaoReais={decisao?.custo.centavos ?? 0}
        cotacaoCambista={taxaDigitada}
        onUsar={usarNaTroca}
      />

      {/* ----------------------------------------------------------- registro */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Registrar troca</CardTitle>
          <CardDescription>
            Sai de uma conta e entra em outra. Não é despesa: não mexe no resultado do mês. A taxa efetiva é calculada e gravada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contas.length < 2 || !contas.some((c) => c.moeda === "BRL") || !contas.some((c) => c.moeda === "BOB") ? (
            <p className="text-sm text-muted-foreground">Para registrar uma troca, é preciso ter uma conta em real e uma em boliviano.</p>
          ) : (
            <form ref={form} action={acao} className="grid gap-4 md:grid-cols-[auto_1fr_1fr_auto_1fr_1fr] md:items-start">
              <Campo rotulo="Data" htmlFor="data" erro={e.data}>
                <Input id="data" name="data" type="date" defaultValue={hoje} required />
              </Campo>
              <Campo rotulo="Saiu de" htmlFor="conta_origem_id" erro={e.conta_origem_id}>
                <Select id="conta_origem_id" name="conta_origem_id" value={origem} onChange={(ev) => setOrigem(ev.target.value)}>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} · {c.moeda}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Valor que saiu" htmlFor="valor_origem" erro={e.valor_origem}>
                <ValorComMoeda id="valor_origem" moeda={moedaOrigem} value={saiu} onChange={setSaiu} />
              </Campo>
              <ArrowRight className="mt-8 hidden size-4 text-muted-foreground md:block" />
              <Campo rotulo="Entrou em" htmlFor="conta_destino_id" erro={e.conta_destino_id}>
                <Select id="conta_destino_id" name="conta_destino_id" value={destino} onChange={(ev) => setDestino(ev.target.value)}>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.moeda === moedaOrigem}>
                      {c.nome} · {c.moeda}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Valor que entrou" htmlFor="valor_destino" erro={e.valor_destino} dica="O que caiu de fato na conta">
                <ValorComMoeda id="valor_destino" moeda={moedaDestino} value={entrou} onChange={setEntrou} />
              </Campo>
              <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-6">
                <p className="text-sm">
                  {moedaOrigem && moedaOrigem === moedaDestino ? (
                    <span className="text-negativo">Origem e destino estão na mesma moeda.</span>
                  ) : previa ? (
                    <>
                      Taxa efetiva desta troca: <span className="num font-semibold">{formatarTaxa(previa)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Preencha os dois valores para ver a taxa efetiva.</span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  {estado.ok && <span className="text-sm text-positivo">Troca registrada.</span>}
                  {estado.erro && <span className="text-sm text-negativo">{estado.erro}</span>}
                  <Button type="submit" disabled={pendente}>
                    {pendente ? "Registrando…" : "Registrar troca"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ValorComMoeda({
  id,
  moeda,
  value,
  onChange,
}: {
  id: string;
  moeda?: Moeda;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium",
          moeda === "BRL" ? "text-brl" : moeda === "BOB" ? "text-bob" : "text-muted-foreground",
        )}
      >
        {moeda ? SIMBOLO[moeda] : "—"}
      </span>
      <Input
        id={id}
        name={id}
        inputMode="decimal"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder="0,00"
        className="num pl-10 text-right"
        required
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparador de rotas
// ---------------------------------------------------------------------------

const CHAVE = "financeiro:rota-usdt";
type Campos = { reaisPorUsdt: string; taxaCompraPct: string; tarifaReais: string; bsPorUsdt: string; taxaVendaPct: string };
const VAZIO: Campos = { reaisPorUsdt: "", taxaCompraPct: "0", tarifaReais: "0", bsPorUsdt: "", taxaVendaPct: "0" };

function lerSalvo(): Campos {
  try {
    const s = localStorage.getItem(CHAVE);
    return s ? { ...VAZIO, ...JSON.parse(s) } : VAZIO;
  } catch {
    return VAZIO;
  }
}

const num = (s: string) => {
  const t = s.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

function Comparador({
  sugestaoReais,
  cotacaoCambista,
  onUsar,
}: {
  sugestaoReais: number;
  cotacaoCambista: number | null;
  onUsar: (centavosReais: number) => void;
}) {
  const [valor, setValor] = useState("");
  const [cambista, setCambista] = useState("");
  const [usdt, setUsdt] = useState<Campos>(VAZIO);
  // cotações do USDT ficam lembradas neste navegador (comodidade, não dado do sistema)
  useEffect(() => {
    const salvo = lerSalvo();
    if (salvo !== VAZIO) setUsdt(salvo); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  const mudar = (k: keyof Campos, v: string) => {
    const n = { ...usdt, [k]: v };
    setUsdt(n);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(n));
    } catch {}
  };

  const reais = centavosDeEntrada(valor || (sugestaoReais ? formatarNumero(sugestaoReais) : ""));
  const cotCambista = num(cambista) ?? cotacaoCambista;
  const parametros = {
    reaisPorUsdt: num(usdt.reaisPorUsdt),
    taxaCompraPct: num(usdt.taxaCompraPct || "0"),
    tarifaReais: num(usdt.tarifaReais || "0"),
    bsPorUsdt: num(usdt.bsPorUsdt),
    taxaVendaPct: num(usdt.taxaVendaPct || "0"),
  };
  const completo = Object.values(parametros).every((v) => v !== null) && cotCambista && reais && reais > 0;
  let r: ReturnType<typeof compararRotas> | null = null;
  let problema: string | null = null;
  if (completo) {
    try {
      r = compararRotas(dinheiro(reais, "BRL"), { bsPorReal: cotCambista }, parametros as Record<keyof Campos, number>);
    } catch (err) {
      problema = (err as Error).message;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparador de rotas</CardTitle>
        <CardDescription>Onde trocar antes de registrar: cambista ou real → USDT → boliviano.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Valor a trocar (R$)" htmlFor="cmp-valor" dica={sugestaoReais && !valor ? "O custo da decisão ao lado" : undefined}>
            <Input
              id="cmp-valor"
              inputMode="decimal"
              value={valor}
              placeholder={sugestaoReais ? formatarNumero(sugestaoReais) : "0,00"}
              onChange={(ev) => setValor(ev.target.value)}
              className="num"
            />
          </Campo>
          <Campo rotulo="Cambista: Bs por R$" htmlFor="cmp-cambista">
            <Input
              id="cmp-cambista"
              inputMode="decimal"
              value={cambista}
              placeholder={cotacaoCambista ? numero(cotacaoCambista) : "2,048"}
              onChange={(ev) => setCambista(ev.target.value)}
              className="num"
            />
          </Campo>
        </div>
        <fieldset className="grid gap-3 rounded-md border p-3">
          <legend className="px-1 text-xs text-muted-foreground">Rota USDT</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Compra: R$ por USDT" htmlFor="u1">
              <Input id="u1" inputMode="decimal" value={usdt.reaisPorUsdt} placeholder="5,40" onChange={(ev) => mudar("reaisPorUsdt", ev.target.value)} className="num" />
            </Campo>
            <Campo rotulo="Comissão compra %" htmlFor="u2">
              <Input id="u2" inputMode="decimal" value={usdt.taxaCompraPct} onChange={(ev) => mudar("taxaCompraPct", ev.target.value)} className="num" />
            </Campo>
            <Campo rotulo="Tarifa fixa R$" htmlFor="u3">
              <Input id="u3" inputMode="decimal" value={usdt.tarifaReais} onChange={(ev) => mudar("tarifaReais", ev.target.value)} className="num" />
            </Campo>
            <Campo rotulo="Venda: Bs por USDT" htmlFor="u4">
              <Input id="u4" inputMode="decimal" value={usdt.bsPorUsdt} placeholder="11,20" onChange={(ev) => mudar("bsPorUsdt", ev.target.value)} className="num" />
            </Campo>
            <Campo rotulo="Comissão venda %" htmlFor="u5">
              <Input id="u5" inputMode="decimal" value={usdt.taxaVendaPct} onChange={(ev) => mudar("taxaVendaPct", ev.target.value)} className="num" />
            </Campo>
          </div>
        </fieldset>

        {problema ? (
          <p className="text-negativo">{problema}</p>
        ) : !r ? (
          <p className="text-muted-foreground">Preencha o valor e as cotações para comparar.</p>
        ) : (
          <div className="grid gap-2">
            {[r.cambista, r.usdt].map((x) => (
              <div
                key={x.rota}
                className={cn("flex items-center justify-between rounded-md border p-3", x === r.melhor && "border-primary/60 bg-primary/5")}
              >
                <div>
                  <p className="font-medium">
                    {x.rota === "cambista" ? "Cambista" : "Rota USDT"}{" "}
                    {x === r.melhor && r.vantagem.centavos > 0 && <Badge variant="outline">melhor</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">efetiva {formatarTaxa(x.bsPorReal)}</p>
                </div>
                <Valor v={x.recebe} colorir={false} className="font-semibold" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {r.vantagem.centavos === 0
                ? "As duas rotas dão o mesmo."
                : `${r.melhor.rota === "usdt" ? "A rota USDT" : "O cambista"} rende ${formatar(r.vantagem)} a mais para ${formatar(dinheiro(reais as number, "BRL"))}.`}
            </p>
            <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => onUsar(reais as number)}>
              Registrar troca deste valor <ArrowRight />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
