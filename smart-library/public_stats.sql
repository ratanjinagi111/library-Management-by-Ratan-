-- ============================================================
-- PUBLIC STATS RPC
-- Run AFTER schema.sql + rls_policies.sql
-- Lets the public landing page show real numbers (books, members,
-- issues) without requiring login, without exposing row-level data.
-- ============================================================

create or replace function public_library_stats()
returns json as $$
  select json_build_object(
    'total_books', (select count(*) from books),
    'available_copies', (select count(*) from book_copies where status = 'available'),
    'registered_members', (select count(*) from members where status = 'active'),
    'books_issued', (select count(*) from book_copies where status = 'issued')
  );
$$ language sql security definer stable;

-- Allow anyone (including logged-out visitors) to call it.
grant execute on function public_library_stats() to anon, authenticated;
