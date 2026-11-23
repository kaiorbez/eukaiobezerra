import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Ambito,
  type DataISO,
  type Dinheiro,
  type Moeda,
  type StatusLancamento,
  type TipoLancamento,
  centavosDeDecimal,
  dinheiro,
  ehMoeda,
} from "@/lib/dominio";

/**
 * Leitura do banco para os tipos do domínio.
 * Todo numeric vem como texto (`::text`) e é lido sem passar por float.
 */

export type TipoConta = "banco" | "dinheiro";

export interface Conta {
  id: string;
  nome: string;
  moeda: Moeda;
  tipo: TipoConta;
  saldoInicial: Dinheiro;
}

export interface Categoria {
  id: string;
  nome: string;
  grupo: string;
}

export interface Lancamento {
  id: string;
  data: DataISO;
  descricao: string;
  valor: Dinheiro;
  tipo: TipoLancamento;
  status: StatusLancamento;
  ambito: Ambito;
  venceEm: DataISO | null;
  contaId: string;
  categoriaId: string | null;
}

export interface Cambio {
  id: string;
  data: DataISO;
  contaOrigemId: string;
  valorOrigem: Dinheiro;
  contaDestinoId: string;
  valorDestino: Dinheiro;
  taxaEfetiva: number;
}

export interface Config {
  cambioReferencia: number;
  cambioReferenciaData: DataISO;
  rateioEscritorio: number;
}

function moeda(x: unknown): Moeda {
  if (!ehMoeda(x)) throw new Error(`moeda desconhecida vinda do banco: ${String(x)}`);
  return x;
}

function falhou(contexto: string, erro: { message: string }): never {
  throw new Error(`${contexto}: ${erro.message}`);
}

type Db = SupabaseClient;

const COLS_CONTA = "id, nome, moeda, tipo, saldo_inicial::text";

type LinhaConta = { id: string; nome: string; moeda: string; tipo: TipoConta; saldo_inicial: string };

function paraConta(r: LinhaConta): Conta {
  const m = moeda(r.moeda);
  return {
    id: r.id,
    nome: r.nome,
    moeda: m,
    tipo: r.tipo,
    saldoInicial: dinheiro(centavosDeDecimal(r.saldo_inicial), m),
  };
}

export async function listarContas(db: Db): Promise<Conta[]> {
  const { data, error } = await db.from("conta").select(COLS_CONTA).order("moeda").order("nome");
  if (error) falhou("listar contas", error);
  return (data as unknown as LinhaConta[]).map(paraConta);
}

export async function buscarConta(db: Db, id: string): Promise<Conta | null> {
  const { data, error } = await db.from("conta").select(COLS_CONTA).eq("id", id).maybeSingle();
  if (error) falhou("buscar conta", error);
  return data ? paraConta(data as unknown as LinhaConta) : null;
}

export async function listarCategorias(db: Db): Promise<Categoria[]> {
  const { data, error } = await db.from("categoria").select("id, nome, grupo").order("grupo").order("nome");
  if (error) falhou("listar categorias", error);
  return data as Categoria[];
}

const COLS_LANC =
  "id, data, descricao, valor::text, moeda, tipo, status, ambito, vence_em, conta_id, categoria_id";

type LinhaLanc = {
  id: string;
  data: string;
  descricao: string;
  valor: string;
  moeda: string;
  tipo: TipoLancamento;
  status: StatusLancamento;
  ambito: Ambito;
  vence_em: string | null;
  conta_id: string;
  categoria_id: string | null;
};

function paraLancamento(r: LinhaLanc): Lancamento {
  return {
    id: r.id,
    data: r.data,
    descricao: r.descricao,
    valor: dinheiro(centavosDeDecimal(r.valor), moeda(r.moeda)),
    tipo: r.tipo,
    status: r.status,
    ambito: r.ambito,
    venceEm: r.vence_em,
    contaId: r.conta_id,
    categoriaId: r.categoria_id,
  };
}

export interface FiltroLancamentos {
  de?: DataISO;
  ate?: DataISO;
  contaId?: string;
  moeda?: Moeda;
  categoriaId?: string;
  ambito?: Ambito;
  status?: StatusLancamento;
}

export async function listarLancamentos(db: Db, f: FiltroLancamentos = {}): Promise<Lancamento[]> {
  let q = db.from("lancamento").select(COLS_LANC);
  if (f.de) q = q.gte("data", f.de);
  if (f.ate) q = q.lte("data", f.ate);
  if (f.contaId) q = q.eq("conta_id", f.contaId);
  if (f.moeda) q = q.eq("moeda", f.moeda);
  if (f.categoriaId) q = q.eq("categoria_id", f.categoriaId);
  if (f.ambito) q = q.eq("ambito", f.ambito);
  if (f.status) q = q.eq("status", f.status);
  const { data, error } = await q.order("data", { ascending: false }).order("criado_em", { ascending: false });
  if (error) falhou("listar lançamentos", error);
  return (data as unknown as LinhaLanc[]).map(paraLancamento);
}

export async function buscarLancamento(db: Db, id: string): Promise<Lancamento | null> {
  const { data, error } = await db.from("lancamento").select(COLS_LANC).eq("id", id).maybeSingle();
  if (error) falhou("buscar lançamento", error);
  return data ? paraLancamento(data as unknown as LinhaLanc) : null;
}

type LinhaCambio = {
  id: string;
  data: string;
  conta_origem_id: string;
  valor_origem: string;
  conta_destino_id: string;
  valor_destino: string;
  taxa_efetiva: string;
};

/** Câmbios entram no saldo das contas. A tela de câmbio é da fase 3. */
export async function listarCambios(db: Db, contas: Conta[]): Promise<Cambio[]> {
  const { data, error } = await db
    .from("cambio")
    .select("id, data, conta_origem_id, valor_origem::text, conta_destino_id, valor_destino::text, taxa_efetiva::text")
    .order("data", { ascending: false });
  if (error) falhou("listar câmbios", error);
  const moedaDe = new Map(contas.map((c) => [c.id, c.moeda]));
  return (data as unknown as LinhaCambio[]).map((r) => ({
    id: r.id,
    data: r.data,
    contaOrigemId: r.conta_origem_id,
    valorOrigem: dinheiro(centavosDeDecimal(r.valor_origem), moeda(moedaDe.get(r.conta_origem_id))),
    contaDestinoId: r.conta_destino_id,
    valorDestino: dinheiro(centavosDeDecimal(r.valor_destino), moeda(moedaDe.get(r.conta_destino_id))),
    taxaEfetiva: Number(r.taxa_efetiva),
  }));
}

export async function lerConfig(db: Db): Promise<Config> {
  const { data, error } = await db
    .from("config")
    .select("cambio_referencia::text, cambio_referencia_data, rateio_escritorio::text")
    .maybeSingle();
  if (error) falhou("ler configurações", error);
  const r = data as unknown as {
    cambio_referencia: string;
    cambio_referencia_data: string;
    rateio_escritorio: string;
  } | null;
  if (!r) return { cambioReferencia: 2, cambioReferenciaData: "", rateioEscritorio: 50 };
  return {
    cambioReferencia: Number(r.cambio_referencia),
    cambioReferenciaData: r.cambio_referencia_data,
    rateioEscritorio: Number(r.rateio_escritorio),
  };
}
