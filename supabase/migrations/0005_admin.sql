-- super-train — papéis: admin e usuário comum
-- Rode este arquivo em Supabase → SQL Editor (uma vez).

-- Qualquer pessoa pode criar conta. Quem não é admin só lê: mapa, territórios
-- e calendário. Escrever em qualquer tabela, e ler os publicadores (que têm
-- telefone), passa a exigir uma linha em `admin`. Quem já tinha conta vira admin.

drop trigger if exists so_email_autorizado on auth.users;
drop function if exists public.so_email_autorizado();
drop table if exists email_autorizado;

create table if not exists admin (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into admin (user_id) select id from auth.users on conflict do nothing;

alter table admin enable row level security;
drop policy if exists "le_o_proprio_admin" on admin;
create policy "le_o_proprio_admin" on admin
  for select to authenticated using (user_id = auth.uid());

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin where user_id = auth.uid());
$$;
revoke execute on function public.eh_admin() from anon, public;
grant execute on function public.eh_admin() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'territorio', 'publicador', 'designacao', 'saida', 'saida_territorio',
    'calendario_nota', 'quadra_feita', 'ponto_parada', 'rodada'
  ] loop
    execute format('drop policy if exists %I on %I', 'auth_full_' || t, t);
    execute format('drop policy if exists %I on %I', 'admin_escreve_' || t, t);
    execute format('drop policy if exists %I on %I', 'todos_leem_' || t, t);
    execute format(
      'create policy %I on %I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())',
      'admin_escreve_' || t, t
    );
    if t <> 'publicador' then
      execute format(
        'create policy %I on %I for select to authenticated using (true)',
        'todos_leem_' || t, t
      );
    end if;
  end loop;
end;
$$;

-- O calendário mostra o nome do dirigente a todos; o telefone fica só com admin.
create or replace view publicador_nome as
  select id, nome, null::text as telefone, created_at from publicador;
revoke all on publicador_nome from anon, public;
grant select on publicador_nome to authenticated;

-- Para promover alguém a admin:
--   insert into admin (user_id)
--   select id from auth.users where email = 'pessoa@exemplo.com';
