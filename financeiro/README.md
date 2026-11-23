# Financeiro multimoeda

Controle financeiro para quem fatura em real e vive em boliviano. Cada lançamento guarda
a moeda em que foi cobrado, cada conta fecha no seu próprio saldo, e a conversão só
aparece onde é decisão. O PRD completo está em [`docs/prd/PRD.md`](docs/prd/PRD.md).

## Status

**Fase 1 · Fundação** ✅ — banco, autenticação, RLS, contas, categorias, lançamentos e
configurações. Portão: um lançamento em cada moeda grava e volta igual (testado).

**Fase 2 · Visão geral** ✅ construída — a tela inicial (`/`), com o seletor de mês movendo todos os cartões:

| Cartão | Regra de moeda |
| --- | --- |
| Frase de veredito (o mês fecha ou não, e por quanto) | resultado à taxa de referência, declarada embaixo |
| Saldos de caixa (Confirmado / No fim do mês, com caixa de seleção por conta) | cada linha na moeda da conta, total por moeda |
| Fluxo de caixa (de hoje ao fim do mês) | um gráfico por moeda, escalas independentes |
| Contas a pagar e a receber (com botão de marcar pago) | valor na moeda cobrada, total por moeda |
| Resultado do mês + rateio empresa/pessoal | convertido à referência; taxa e data no rodapé |
| Últimos lançamentos (os 8 mais recentes) | valor na moeda cobrada |

Portão da fase 2 — *novembro de 2026 reproduz os números do painel atual*:
- ✅ com a **massa sintética** em `src/lib/dominio/__fixtures__/novembro-2026.ts`, montada à mão
  para cair nos números da seção 8 do PRD. Todos os critérios de saldos, a pagar, a receber,
  resultado, rateio e parâmetros passam (`npm test`) e aparecem certos na tela.
- ⏳ com os **lançamentos reais** de novembro: falta cadastrá-los e conferir. Só isso fecha o portão de verdade.

**Fase 3 · Câmbio** ✅ — tela `/cambio` e o 7º cartão da Visão geral:

- **Registrar troca:** conta de origem, valor que saiu, conta de destino, valor que entrou. A taxa
  efetiva é calculada pelo banco (coluna gerada) e mostrada antes de gravar. A troca mexe nos saldos
  das duas contas e não entra no resultado do mês: não é despesa.
- **Decisão de câmbio:** quanto falta em boliviano no fim do mês e quanto custa em real, sempre ao
  câmbio **efetivo** (a última troca), que pode ser sobrescrito pela cotação do dia. Margem de
  segurança opcional. O código recusa decidir com o câmbio de referência.
- **Comparador de rotas:** cambista × real → USDT → boliviano, com comissões e tarifa fixa. As
  cotações do USDT ficam lembradas no navegador.
- **Diferença contra a referência:** cada troca mostra quanto rendeu a mais ou a menos que a
  referência (a de 21/11 rendeu Bs 154,60 ≈ R$ 77,30 a mais que 2,000). É calculada, não gravada.
- **Portão:** a troca de 21/11 (R$ 3.200,00 → Bs 6.554,60) devolve taxa efetiva 2,0483 — no banco,
  no domínio e na tela ✅.

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
npm test          # domínio: moeda, câmbio, saldos, fluxo, resultado, rateio e os critérios da seção 8
npm run test:db   # schema num Postgres descartável: moeda, RLS, câmbio, nada de float
npm run typecheck
npm run lint
```

`test:db` precisa dos binários do Postgres (`initdb`, `pg_ctl`, `psql`) instalados.

## Deploy na Vercel

Importe o repositório, defina **Root Directory = `financeiro`** e cadastre as variáveis
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
