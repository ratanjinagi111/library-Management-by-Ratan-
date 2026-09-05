-- Run once in Supabase SQL Editor after schema.sql.
-- Reservations reserve one physical copy and notify staff.

create or replace function public.reserve_book(
  p_book_id uuid,
  p_member_id uuid,
  p_expiry_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_copy_id uuid;
  book_title text;
  available_count integer;
  issued_count integer;
begin
  if not exists (
    select 1 from members where id = p_member_id and user_id = auth.uid()
  ) then
    raise exception 'You can only reserve books for your own member account';
  end if;

  select title into book_title from books where id = p_book_id;
  if book_title is null then
    raise exception 'Book not found';
  end if;

  select id into selected_copy_id
  from book_copies
  where book_id = p_book_id and status = 'available'
  order by accession_number
  for update skip locked
  limit 1;

  if selected_copy_id is null then
    raise exception 'No available copies remain';
  end if;

  update book_copies set status = 'reserved' where id = selected_copy_id;

  insert into reservations (book_id, member_id, expiry_date)
  values (p_book_id, p_member_id, p_expiry_date);

  select count(*) into available_count
  from book_copies where book_id = p_book_id and status = 'available';
  select count(*) into issued_count
  from book_copies where book_id = p_book_id and status = 'issued';

  insert into notifications (user_id, title, message, type)
  select id,
    'New book reservation',
    format('%s was reserved. Available: %s | Issued: %s', book_title, available_count, issued_count),
    'info'
  from profiles
  where role in ('admin', 'librarian');

  return jsonb_build_object(
    'available_count', available_count,
    'issued_count', issued_count
  );
end;
$$;
