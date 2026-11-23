-- Testes do schema da Fase 1. Rodar com: npm run test:db
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'kaio@exemplo.com'),
  ('00000000-0000-0000-0000-00000000000b', 'outro@exemplo.com');

-- o gatilho de novo usuário criou config e categorias
do $$ begin
  assert (select count(*) from public.config) = 2, 'config por usuário';
  assert (select cambio_referencia from public.config limit 1) = 2.000000, 'referência padrão 2,000';
  assert (select rateio_escritorio from public.config limit 1) = 50.00, 'rateio padrão 50%';
  assert (select count(*) from public.categoria where user_id = '00000000-0000-0000-0000-00000000000a') = 15, 'categorias iniciais';
end $$;

-- nenhuma coluna de dinheiro é float
do $$ begin
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and data_type in ('real', 'double precision')
  ), 'há coluna float no schema';
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and data_type like 'timestamp%' and column_name in ('data', 'vence_em')
  ), 'data e vence_em precisam ser date';
end $$;

-- age como o usuário A
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

insert into public.conta (id, nome, moeda, saldo_inicial) values
  ('10000000-0000-0000-0000-000000000001', 'Santander', 'BRL', 0),
  ('10000000-0000-0000-0000-000000000002', 'Efectivo Bs', 'BOB', 0);

-- Portão da Fase 1: um lançamento em cada moeda grava e volta igual.
-- O cliente tenta mandar BRL para a conta em bolivianos: o banco ignora e grava BOB.
insert into public.lancamento (id, data, descricao, valor, moeda, tipo, conta_id) values
  ('20000000-0000-0000-0000-000000000001', '2026-11-20', 'Yango', 248.00, 'BRL', 'despesa', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000002', '2026-11-20', 'Cliente X', 1500.00, null, 'receita', '10000000-0000-0000-0000-000000000001');

do $$ begin
  assert (select valor::text || ' ' || moeda from public.lancamento where id = '20000000-0000-0000-0000-000000000001') = '248.00 BOB',
    'Bs 248,00 precisa voltar como 248.00 BOB';
  assert (select valor::text || ' ' || moeda from public.lancamento where id = '20000000-0000-0000-0000-000000000002') = '1500.00 BRL',
    'R$ 1.500,00 precisa voltar como 1500.00 BRL';
end $$;

-- mudar a moeda de um lançamento direto não pega: ela volta a ser a da conta
update public.lancamento set moeda = 'BRL' where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select moeda from public.lancamento where id = '20000000-0000-0000-0000-000000000001') = 'BOB', 'moeda segue a conta';
end $$;

-- trocar o lançamento de conta troca a moeda junto
update public.lancamento set conta_id = '10000000-0000-0000-0000-000000000001' where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select moeda from public.lancamento where id = '20000000-0000-0000-0000-000000000001') = 'BRL', 'moeda acompanha troca de conta';
end $$;
update public.lancamento set conta_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000001';

-- conta com movimento não muda de moeda
do $$ begin
  begin
    update public.conta set moeda = 'BRL' where id = '10000000-0000-0000-0000-000000000002';
    raise exception 'deveria ter bloqueado';
  exception when restrict_violation then null;
  end;
end $$;

-- valor zero ou negativo é recusado
do $$ begin
  begin
    insert into public.lancamento (data, descricao, valor, tipo, conta_id)
      values ('2026-11-20', 'x', -10, 'despesa', '10000000-0000-0000-0000-000000000001');
    raise exception 'deveria ter bloqueado';
  exception when check_violation then null;
  end;
end $$;

-- Câmbio de 21/11: R$ 3.200,00 → Bs 6.554,60 grava taxa efetiva 2,0483
insert into public.cambio (id, data, conta_origem_id, valor_origem, conta_destino_id, valor_destino) values
  ('30000000-0000-0000-0000-000000000001', '2026-11-21',
   '10000000-0000-0000-0000-000000000001', 3200.00,
   '10000000-0000-0000-0000-000000000002', 6554.60);
do $$ begin
  assert (select round(taxa_efetiva, 4) from public.cambio where id = '30000000-0000-0000-0000-000000000001') = 2.0483,
    'taxa efetiva 2,0483';
end $$;

-- câmbio entre duas contas da mesma moeda é recusado
insert into public.conta (id, nome, moeda) values ('10000000-0000-0000-0000-000000000003', 'Nubank', 'BRL');
do $$ begin
  begin
    insert into public.cambio (data, conta_origem_id, valor_origem, conta_destino_id, valor_destino)
      values ('2026-11-21', '10000000-0000-0000-0000-000000000001', 10, '10000000-0000-0000-0000-000000000003', 10);
    raise exception 'deveria ter bloqueado';
  exception when check_violation then null;
  end;
end $$;

-- apagar uma categoria só limpa a referência do lançamento
update public.lancamento set categoria_id = (select id from public.categoria where nome = 'Transporte')
  where id = '20000000-0000-0000-0000-000000000001';
delete from public.categoria where nome = 'Transporte';
do $$ begin
  assert (select categoria_id from public.lancamento where id = '20000000-0000-0000-0000-000000000001') is null, 'categoria some, lançamento fica';
end $$;

-- RLS: o usuário B não vê nada de A e não consegue usar a conta de A
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.conta) = 0, 'B não vê contas de A';
  assert (select count(*) from public.lancamento) = 0, 'B não vê lançamentos de A';
  assert (select count(*) from public.cambio) = 0, 'B não vê câmbios de A';
  assert (select count(*) from public.config) = 1, 'B vê só a própria config';
  begin
    insert into public.lancamento (data, descricao, valor, tipo, conta_id)
      values ('2026-11-20', 'invasão', 1, 'despesa', '10000000-0000-0000-0000-000000000001');
    raise exception 'deveria ter bloqueado';
  exception when foreign_key_violation then null;
  end;
end $$;

-- anônimo não lê nada
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.lancamento;
    raise exception 'deveria ter bloqueado';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
\echo 'OK: todos os testes do schema passaram'
