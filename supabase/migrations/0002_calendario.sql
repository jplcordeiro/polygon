-- super-train — calendário de saídas de campo
-- Rode este arquivo em Supabase → SQL Editor (uma vez).

create table if not exists saida (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  periodo       text not null check (periodo in ('manha', 'tarde')),
  hora          time,                                                -- opcional: só quando foge do padrão
  local         text,                                                -- ponto de encontro
  publicador_id uuid references publicador(id) on delete restrict,   -- nulo = dirigente a definir
  observacao    text,
  created_at    timestamptz not null default now()
);

-- Um dia comporta N saídas: domingo tem duas na mesma manhã, em locais diferentes.
create index if not exists saida_data_idx on saida (data);
create index if not exists saida_publicador_idx on saida (publicador_id);

create table if not exists saida_territorio (
  saida_id      uuid not null references saida(id) on delete cascade,
  territorio_id uuid not null references territorio(id) on delete restrict,
  primary key (saida_id, territorio_id)
);

create index if not exists saida_territorio_territorio_idx
  on saida_territorio (territorio_id);

-- Avisos gerais do mês ("todos os domingos temos duas saídas", "terças à tarde 16:30h").
create table if not exists calendario_nota (
  mes   date primary key,   -- sempre o dia 1 do mês
  texto text not null
);

-- ------- RLS: autenticado = tudo, anônimo = nada -------
alter table saida enable row level security;
alter table saida_territorio enable row level security;
alter table calendario_nota enable row level security;

create policy "auth_full_saida" on saida
  for all to authenticated using (true) with check (true);
create policy "auth_full_saida_territorio" on saida_territorio
  for all to authenticated using (true) with check (true);
create policy "auth_full_calendario_nota" on calendario_nota
  for all to authenticated using (true) with check (true);
