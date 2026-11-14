-- super-train — contas ligadas a publicadores e gestão de admins
-- Rode este arquivo em Supabase → SQL Editor (uma vez).

-- Uma conta pode ser um publicador (no máximo um, e cada publicador no máximo
-- uma conta). Assim o calendário sabe quais saídas são "suas".
alter table publicador
  add column if not exists user_id uuid unique references auth.users (id) on delete set null;

create or replace view publicador_nome as
  select id, nome, null::text as telefone, created_at, user_id from publicador;
revoke all on publicador_nome from anon, public;
grant select on publicador_nome to authenticated;

-- Admin promove e rebaixa outras contas pela tela Usuários.
drop policy if exists "admin_gerencia_admin" on admin;
create policy "admin_gerencia_admin" on admin
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- O e-mail das contas mora em auth.users, que a API não expõe: só admin lista.
create or replace function public.listar_usuarios()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  admin boolean,
  publicador_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'apenas admin' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.created_at,
           exists (select 1 from public.admin a where a.user_id = u.id),
           (select p.id from public.publicador p where p.user_id = u.id)
    from auth.users u
    order by u.email;
end;
$$;
revoke execute on function public.listar_usuarios() from anon, public;
grant execute on function public.listar_usuarios() to authenticated;
