# Financeiro multimoeda

Controle financeiro para quem fatura em real e vive em boliviano. Cada lançamento guarda
a moeda em que foi cobrado, cada conta fecha no seu próprio saldo, e a conversão só
aparece onde é decisão. O PRD completo está em [`docs/prd/PRD.md`](docs/prd/PRD.md).

## Status: Fase 1 · Fundação

| | |
| --- | --- |
| Banco, autenticação e RLS | ✅ |
| Contas (CRUD, saldo confirmado e no fim do mês, total **por moeda**) | ✅ |
| Categorias (CRUD, agrupadas por grupo do relatório) | ✅ |
| Lançamentos (formulário, lista filtrável por mês, conta, moeda, categoria, âmbito e status) | ✅ |
| Configurações (câmbio de referência com data, rateio do escritório) | ✅ |
| **Portão:** um lançamento em cada moeda grava e volta igual | ✅ testado no banco e no navegador |

Fases seguintes (ver PRD, seção 7): 2 · Visão geral, 3 · Câmbio, 4 · Rotina.
O schema da tabela `cambio` já existe e os câmbios já entram no saldo das contas;
falta a tela de registro e o comparador de rotas (fase 3).

## As duas regras que o código não deixa quebrar

1. **Nenhum valor convertido é gravado.** Não existe coluna `valor_em_reais`. O par
   `valor` + `moeda` nunca se separa — e a moeda do lançamento nem é enviada pelo
   formulário: um gatilho copia a moeda da conta e uma chave estrangeira composta
   `(conta_id, user_id, moeda)` torna impossível gravar um lançamento numa moeda
   diferente da conta.
2. **Moedas nunca são somadas sem taxa.** Em TypeScript, `somar()` lança
   `MoedasDiferentesError` se as moedas diferem; totais são sempre `totaisPorMoeda()`.
   Toda conversão (`converter()`) devolve o valor junto com a taxa e a data usadas.

Outras decisões do PRD (seção 6) que estão no schema: dinheiro em `numeric(14,2)`, taxa
em `numeric(12,6)`, datas em `date` sem fuso, RLS ligado em todas as tabelas, taxa efetiva
do câmbio como coluna gerada (`valor_destino ÷ valor_origem`, impossível divergir).

## Estrutura

```
src/
  lib/dominio/        cálculo puro em TypeScript, sem banco (moeda, câmbio, saldo, datas)
  lib/dados.ts        leitura do banco → tipos do domínio (numeric lido como texto, sem float)
  lib/supabase/       clientes do Supabase para servidor
  proxy.ts            renova a sessão e protege as rotas (o "middleware" do Next 16)
  app/login/          entrar / criar conta
  app/(app)/          telas autenticadas: lancamentos, contas, categorias, configuracoes
  components/ui/      componentes no padrão shadcn/ui
supabase/
  migrations/         o schema (fase 1)
  tests/              testes SQL do schema (moeda, RLS, câmbio 2,0483)
docs/prd/             o PRD e os diagramas
```

## Rodar

Requer Node 22+.

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a publishable key do Supabase
npm run dev
```

### Banco no Supabase (nuvem)

Crie um projeto em supabase.com e aplique a migração — pelo SQL Editor (cole o conteúdo
de `supabase/migrations/20261123000000_fase1_fundacao.sql`) ou pela CLI:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Em Authentication → URL Configuration, aponte o *Site URL* para o endereço do app e
inclua `https://SEU-APP/auth/callback` nas *Redirect URLs*.

### Banco local (Docker)

```bash
npx supabase start -x studio,realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
npx supabase status   # mostra a URL e a publishable key para o .env.local
```

## Testes

```bash
npm test          # domínio: Bs 248 volta Bs 248, taxa 2,0483, saldos, datas sem fuso
npm run test:db   # schema num Postgres descartável: moeda, RLS, câmbio, nada de float
npm run typecheck
npm run lint
```

`test:db` precisa dos binários do Postgres (`initdb`, `pg_ctl`, `psql`) instalados.

## Deploy na Vercel

Importe o repositório, defina **Root Directory = `financeiro`** e cadastre as variáveis
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
