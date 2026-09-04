-- ============================================================
-- SMART LIBRARY — ROW LEVEL SECURITY POLICIES
-- Run AFTER schema.sql
-- ============================================================

-- Helper: is the current user staff (admin or librarian)?
create or replace function is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','librarian')
  );
$$ language sql stable security definer;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_select_own_or_staff" on profiles
  for select using (id = auth.uid() or is_staff());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_staff_manage" on profiles
  for all using (is_staff());

-- ------------------------------------------------------------
-- MEMBERS
-- ------------------------------------------------------------
alter table members enable row level security;

create policy "members_select_own_or_staff" on members
  for select using (user_id = auth.uid() or is_staff());

create policy "members_update_own_limited" on members
  for update using (user_id = auth.uid());

create policy "members_staff_manage" on members
  for all using (is_staff());

-- ------------------------------------------------------------
-- LIBRARIANS
-- ------------------------------------------------------------
alter table librarians enable row level security;

create policy "librarians_select_staff" on librarians
  for select using (is_staff());

create policy "librarians_admin_manage" on librarians
  for all using (is_admin());

-- ------------------------------------------------------------
-- AUTHORS / CATEGORIES / PUBLISHERS / SHELVES  (read: everyone signed in, write: staff)
-- ------------------------------------------------------------
alter table authors enable row level security;
alter table categories enable row level security;
alter table publishers enable row level security;
alter table shelves enable row level security;

create policy "authors_read_all" on authors for select using (auth.uid() is not null);
create policy "authors_staff_write" on authors for all using (is_staff());

create policy "categories_read_all" on categories for select using (auth.uid() is not null);
create policy "categories_staff_write" on categories for all using (is_staff());

create policy "publishers_read_all" on publishers for select using (auth.uid() is not null);
create policy "publishers_staff_write" on publishers for all using (is_staff());

create policy "shelves_read_all" on shelves for select using (auth.uid() is not null);
create policy "shelves_staff_write" on shelves for all using (is_staff());

-- ------------------------------------------------------------
-- BOOKS / BOOK_COPIES  (read: everyone signed in, write: staff)
-- ------------------------------------------------------------
alter table books enable row level security;
alter table book_copies enable row level security;

create policy "books_read_all" on books for select using (auth.uid() is not null);
create policy "books_staff_write" on books for all using (is_staff());

create policy "copies_read_all" on book_copies for select using (auth.uid() is not null);
create policy "copies_staff_write" on book_copies for all using (is_staff());

-- ------------------------------------------------------------
-- ISSUES
-- ------------------------------------------------------------
alter table issues enable row level security;

create policy "issues_member_select_own" on issues
  for select using (
    member_id in (select id from members where user_id = auth.uid())
    or is_staff()
  );

create policy "issues_staff_manage" on issues
  for all using (is_staff());

-- ------------------------------------------------------------
-- FINES
-- ------------------------------------------------------------
alter table fines enable row level security;

create policy "fines_member_select_own" on fines
  for select using (
    issue_id in (
      select i.id from issues i
      join members m on m.id = i.member_id
      where m.user_id = auth.uid()
    )
    or is_staff()
  );

create policy "fines_staff_manage" on fines
  for all using (is_staff());

-- ------------------------------------------------------------
-- RESERVATIONS
-- ------------------------------------------------------------
alter table reservations enable row level security;

create policy "reservations_member_select_own" on reservations
  for select using (
    member_id in (select id from members where user_id = auth.uid())
    or is_staff()
  );

create policy "reservations_member_insert_own" on reservations
  for insert with check (
    member_id in (select id from members where user_id = auth.uid())
  );

create policy "reservations_member_cancel_own" on reservations
  for update using (
    member_id in (select id from members where user_id = auth.uid())
  );

create policy "reservations_staff_manage" on reservations
  for all using (is_staff());

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
alter table notifications enable row level security;

create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid());

create policy "notifications_staff_insert" on notifications
  for insert with check (is_staff() or user_id = auth.uid());

-- ------------------------------------------------------------
-- ACTIVITY_LOGS  (admin only)
-- ------------------------------------------------------------
alter table activity_logs enable row level security;

create policy "activity_logs_admin_select" on activity_logs
  for select using (is_admin());

create policy "activity_logs_staff_insert" on activity_logs
  for insert with check (is_staff());

-- ------------------------------------------------------------
-- LIBRARY_SETTINGS  (read: everyone signed in, write: admin only)
-- ------------------------------------------------------------
alter table library_settings enable row level security;

create policy "settings_read_all" on library_settings
  for select using (auth.uid() is not null);

create policy "settings_admin_write" on library_settings
  for all using (is_admin());
