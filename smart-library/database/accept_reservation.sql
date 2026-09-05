-- Run once in Supabase SQL Editor after reserve_book_function.sql.
-- Accepting a reservation creates the member borrowing atomically.

alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('pending', 'accepted', 'available', 'completed', 'cancelled', 'expired'));

create or replace function public.accept_reservation(
  p_reservation_id uuid,
  p_due_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_row reservations%rowtype;
  reserved_copy_id uuid;
  issue_id uuid;
  available_count integer;
  issued_count integer;
  librarian_id uuid;
  book_title text;
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'librarian')
  ) then
    raise exception 'Only library staff can accept reservations';
  end if;

  select * into reservation_row
  from reservations
  where id = p_reservation_id
  for update;

  if reservation_row.id is null then
    raise exception 'Reservation not found';
  end if;
  if reservation_row.status <> 'pending' then
    raise exception 'Only pending reservations can be accepted';
  end if;

  select id into reserved_copy_id
  from book_copies
  where book_id = reservation_row.book_id and status = 'reserved'
  order by accession_number
  for update skip locked
  limit 1;

  if reserved_copy_id is null then
    raise exception 'No reserved copy is available for this reservation';
  end if;

  select id into librarian_id
  from librarians
  where user_id = auth.uid()
  limit 1;

  insert into issues (copy_id, member_id, librarian_id, due_date)
  values (reserved_copy_id, reservation_row.member_id, librarian_id, coalesce(p_due_date, current_date + 14))
  returning id into issue_id;

  update book_copies set status = 'issued' where id = reserved_copy_id;
  update reservations set status = 'accepted' where id = p_reservation_id;

  select title into book_title from books where id = reservation_row.book_id;
  select count(*) into available_count from book_copies where book_id = reservation_row.book_id and status = 'available';
  select count(*) into issued_count from book_copies where book_id = reservation_row.book_id and status = 'issued';

  insert into notifications (user_id, title, message, type)
  select p.id,
    'Reservation accepted',
    format('%s is now in your borrowings. Due date: %s', book_title, coalesce(p_due_date, current_date + 14)),
    'reservation_available'
  from members m
  join profiles p on p.id = m.user_id
  where m.id = reservation_row.member_id;

  return jsonb_build_object(
    'issue_id', issue_id,
    'available_count', available_count,
    'issued_count', issued_count
  );
end;
$$;
