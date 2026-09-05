begin;

grant delete on table public.orders to authenticated;

drop policy if exists "Active admins delete orders"
on public.orders;

create policy "Active admins delete orders"
on public.orders
for delete
to authenticated
using (
  public.is_active_admin()
);

commit;
