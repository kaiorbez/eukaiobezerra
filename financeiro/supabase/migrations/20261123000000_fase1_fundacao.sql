-- Fase 1 · Fundação
-- PRD, seções 3, 4 e 6.
--
-- Regras que este schema impõe no próprio banco, e não só no código:
--   * Dinheiro é numeric(14,2) e taxa é numeric(12,6). Nenhuma coluna float.
--   * Datas de calendário são `date`, sem fuso.
--   * Nenhuma coluna guarda valor convertido. O par valor + moeda nunca se separa.
--   * A moeda do lançamento vem da conta e é verificada por chave estrangeira
--     composta: é impossível gravar um lançamento numa moeda diferente da conta.
--   * RLS ligado em todas as tabelas desde o primeiro dia.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.moeda as enum ('BRL', 'BOB');
create type public.tipo_conta as enum ('banco', 'dinheiro');
create type public.tipo_lancamento as enum ('receita', 'despesa');
create type public.status_lancamento as enum ('previsto', 'pago');
create type public.ambito as enum ('empresa', 'pessoal', 'casa');

-- ---------------------------------------------------------------------------
-- conta
-- ---------------------------------------------------------------------------

create table public.conta (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome          text not null check (length(trim(nome)) > 0),
  moeda         public.moeda not null,
  saldo_inicial numeric(14, 2) not null default 0,
  tipo          public.tipo_conta not null default 'banco',
  criado_em     timestamptz not null default now(),
  unique (user_id, nome),
  -- alvo das chaves estrangeiras compostas abaixo
  unique (id, user_id),
  unique (id, user_id, moeda)
);

-- ---------------------------------------------------------------------------
-- categoria
-- ---------------------------------------------------------------------------

create table public.categoria (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome      text not null check (length(trim(nome)) > 0),
  grupo     text not null check (length(trim(grupo)) > 0),
  criado_em timestamptz not null default now(),
  unique (user_id, nome),
  unique (id, user_id)
);

-- ---------------------------------------------------------------------------
-- lancamento (a tabela central)
-- ---------------------------------------------------------------------------

create table public.lancamento (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data         date not null,
  descricao    text not null check (length(trim(descricao)) > 0),
  -- valor sempre positivo; o sinal vem de `tipo`
  valor        numeric(14, 2) not null check (valor > 0),
  -- moeda nativa: preenchida pelo gatilho a partir da conta, nunca pelo cliente
  moeda        public.moeda not null,
  tipo         public.tipo_lancamento not null,
  status       public.status_lancamento not null default 'pago',
  ambito       public.ambito not null default 'pessoal',
  vence_em     date,
  conta_id     uuid not null,
  categoria_id uuid,
  criado_em    timestamptz not null default now(),

  -- a conta tem de ser do mesmo usuário E ter a mesma moeda do lançamento
  foreign key (conta_id, user_id, moeda)
    references public.conta (id, user_id, moeda)
    on update restrict on delete restrict,
  -- a categoria tem de ser do mesmo usuário; apagar a categoria só limpa a referência
  foreign key (categoria_id, user_id)
    references public.categoria (id, user_id)
    on delete set null (categoria_id)
);

create index lancamento_user_data_idx on public.lancamento (user_id, data desc);
create index lancamento_conta_idx on public.lancamento (conta_id);
create index lancamento_categoria_idx on public.lancamento (categoria_id);

-- A moeda do lançamento é sempre a moeda da conta. O que vier do cliente é ignorado.
create function public.lancamento_moeda_da_conta()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select c.moeda into new.moeda
  from public.conta c
  where c.id = new.conta_id and c.user_id = new.user_id;

  if new.moeda is null then
    raise exception 'conta % não encontrada para este usuário', new.conta_id
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

create trigger lancamento_moeda_da_conta
  before insert or update of conta_id, moeda, user_id on public.lancamento
  for each row execute function public.lancamento_moeda_da_conta();

-- ---------------------------------------------------------------------------
-- cambio (operação própria: sai de uma conta e entra em outra; nunca é despesa)
-- ---------------------------------------------------------------------------

create table public.cambio (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data             date not null,
  conta_origem_id  uuid not null,
  valor_origem     numeric(14, 2) not null check (valor_origem > 0),
  conta_destino_id uuid not null,
  valor_destino    numeric(14, 2) not null check (valor_destino > 0),
  -- taxa efetiva = destino ÷ origem, gravada e impossível de divergir dos valores
  taxa_efetiva     numeric(12, 6) generated always as (round(valor_destino / valor_origem, 6)) stored,
  criado_em        timestamptz not null default now(),

  check (conta_origem_id <> conta_destino_id),
  foreign key (conta_origem_id, user_id)
    references public.conta (id, user_id) on delete restrict,
  foreign key (conta_destino_id, user_id)
    references public.conta (id, user_id) on delete restrict
);

create index cambio_user_data_idx on public.cambio (user_id, data desc);

-- Uma troca liga duas moedas diferentes.
create function public.cambio_moedas_diferentes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  m_origem public.moeda;
  m_destino public.moeda;
begin
  select moeda into m_origem from public.conta where id = new.conta_origem_id;
  select moeda into m_destino from public.conta where id = new.conta_destino_id;
  if m_origem = m_destino then
    raise exception 'câmbio precisa ligar duas moedas diferentes (as duas contas são %)', m_origem
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger cambio_moedas_diferentes
  before insert or update of conta_origem_id, conta_destino_id on public.cambio
  for each row execute function public.cambio_moedas_diferentes();

-- Uma conta com lançamentos ou câmbios não pode trocar de moeda.
create function public.conta_moeda_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.moeda is distinct from old.moeda and (
    exists (select 1 from public.lancamento where conta_id = old.id)
    or exists (select 1 from public.cambio where conta_origem_id = old.id or conta_destino_id = old.id)
  ) then
    raise exception 'a conta "%" já tem movimentos em %; a moeda não pode mudar', old.nome, old.moeda
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger conta_moeda_imutavel
  before update of moeda on public.conta
  for each row execute function public.conta_moeda_imutavel();

-- ---------------------------------------------------------------------------
-- config (os dois parâmetros do cálculo; uma linha por usuário)
-- ---------------------------------------------------------------------------

create table public.config (
  user_id                uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- bolivianos por real
  cambio_referencia      numeric(12, 6) not null default 2.000000 check (cambio_referencia > 0),
  -- a data em que a referência foi definida; aparece em toda tela que converte
  cambio_referencia_data date not null default current_date,
  -- percentual (0 a 100) do âmbito "casa" que é da empresa
  rateio_escritorio      numeric(5, 2) not null default 50.00 check (rateio_escritorio between 0 and 100),
  atualizado_em          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: cada usuário só enxerga e só grava o que é dele
-- ---------------------------------------------------------------------------

alter table public.conta      enable row level security;
alter table public.categoria  enable row level security;
alter table public.lancamento enable row level security;
alter table public.cambio     enable row level security;
alter table public.config     enable row level security;

create policy "dono" on public.conta for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.categoria for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.lancamento for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.cambio for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.config for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.conta, public.categoria, public.lancamento, public.cambio, public.config from anon;

-- ---------------------------------------------------------------------------
-- Novo usuário: cria a config e as categorias iniciais
-- ---------------------------------------------------------------------------

create function public.preparar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.config (user_id) values (new.id);

  insert into public.categoria (user_id, nome, grupo) values
    (new.id, 'Clientes',                 'Receitas'),
    (new.id, 'Outras receitas',          'Receitas'),
    (new.id, 'Aluguel',                  'Casa'),
    (new.id, 'Energia e água',           'Casa'),
    (new.id, 'Internet e telefone',      'Casa'),
    (new.id, 'Ferramentas e assinaturas','Empresa'),
    (new.id, 'Anúncios',                 'Empresa'),
    (new.id, 'Impostos e taxas',         'Empresa'),
    (new.id, 'Mercado',                  'Vida'),
    (new.id, 'Restaurantes',             'Vida'),
    (new.id, 'Transporte',               'Vida'),
    (new.id, 'Saúde',                    'Vida'),
    (new.id, 'Educação',                 'Vida'),
    (new.id, 'Lazer',                    'Vida'),
    (new.id, 'Outros',                   'Outros');

  return new;
end;
$$;

create trigger preparar_novo_usuario
  after insert on auth.users
  for each row execute function public.preparar_novo_usuario();
