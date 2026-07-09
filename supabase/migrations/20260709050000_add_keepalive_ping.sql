create or replace function public.keepalive_ping()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

revoke execute on function public.keepalive_ping() from public;
revoke execute on function public.keepalive_ping() from authenticated;
grant execute on function public.keepalive_ping() to anon;
