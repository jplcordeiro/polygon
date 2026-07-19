-- super-train — rodadas com histórico
-- Rode este arquivo em Supabase → SQL Editor (uma vez).

-- Até aqui a rodada era um único `date` em territorio.progresso_desde: só o corte
-- atual, sem passado. Isso reescrevia o relatório — um território que fechou dia
-- 12 deixava de contar como concluído no mês assim que uma rodada nova começava,
-- porque não sobrava registro de onde a rodada anterior tinha começado.
-- Agora cada rodada é uma linha, e o corte atual é a mais recente.

-- 1) A rodada. `nome` só é preenchido em campanha ("Convites do congresso");
--    rodada normal é anônima. Uma campanha não é um objeto: são N rodadas que
--    compartilham `inicio` e `nome`, criadas no mesmo gesto.
create table if not exists rodada (
  id            uuid primary key default gen_random_uuid(),
  territorio_id uuid not null references territorio (id) on delete cascade,
  inicio        date not null,
  nome          text,
  created_at    timestamptz not null default now(),
  unique (territorio_id, inicio)
);

create index if not exists rodada_territorio_idx on rodada (territorio_id, inicio desc);

alter table rodada enable row level security;

drop policy if exists "auth_full_rodada" on rodada;
create policy "auth_full_rodada" on rodada
  for all to authenticated using (true) with check (true);

-- 2) Backfill: o corte que existia vira a primeira rodada registrada. Territórios
--    com progresso_desde nulo não ganham linha — rodada nula = conta desde sempre.
insert into rodada (territorio_id, inicio)
select id, progresso_desde from territorio where progresso_desde is not null
on conflict (territorio_id, inicio) do nothing;

-- 3) A coluna vira derivada da tabela e sai, para não haver duas fontes de verdade.
alter table territorio drop column if exists progresso_desde;
