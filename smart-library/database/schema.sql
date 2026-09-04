-- ============================================================
-- SMART LIBRARY — DATABASE SCHEMA
-- Run this entire file in the Supabase SQL Editor (project: zhbhyujlbeixrdqufduj)
-- Order matters: tables reference earlier tables via foreign keys.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ------------------------------------------------------------
-- Generic updated_at trigger function (reused by several tables)
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. PROFILES  (extends auth.users — id must equal auth.users.id)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role text not null check (role in ('admin','librarian','member')),
  profile_image text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ============================================================
-- 2. MEMBERS
-- ============================================================
create table members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  registration_number text not null unique,
  department text,
  semester int,
  date_of_birth date,
  gender text,
  address text,
  registration_date date not null default current_date,
  membership_expiry date,
  status text not null default 'active' check (status in ('active','inactive','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_members_reg_number on members(registration_number);
create index idx_members_status on members(status);
create trigger trg_members_updated_at before update on members
  for each row execute function set_updated_at();

-- ============================================================
-- 3. LIBRARIANS
-- ============================================================
create table librarians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  employee_id text not null unique,
  designation text,
  joining_date date not null default current_date,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_librarians_employee_id on librarians(employee_id);
create trigger trg_librarians_updated_at before update on librarians
  for each row execute function set_updated_at();

-- ============================================================
-- 4. AUTHORS
-- ============================================================
create table authors (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  biography text,
  country text,
  created_at timestamptz not null default now()
);
create index idx_authors_name on authors(author_name);

-- ============================================================
-- 5. CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  category_name text not null unique,
  description text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. PUBLISHERS
-- ============================================================
create table publishers (
  id uuid primary key default gen_random_uuid(),
  publisher_name text not null,
  email text,
  phone text,
  address text,
  website text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. SHELVES
-- ============================================================
create table shelves (
  id uuid primary key default gen_random_uuid(),
  shelf_code text not null unique,
  shelf_name text,
  floor text,
  section text,
  description text,
  status text not null default 'active' check (status in ('active','inactive'))
);

-- ============================================================
-- 8. BOOKS
-- ============================================================
create table books (
  id uuid primary key default gen_random_uuid(),
  isbn text not null unique,
  title text not null,
  author_id uuid references authors(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  publisher_id uuid references publishers(id) on delete set null,
  language text default 'English',
  publication_year int,
  edition text,
  price numeric(10,2),
  description text,
  cover_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_books_title on books(title);
create index idx_books_isbn on books(isbn);
create index idx_books_author on books(author_id);
create index idx_books_category on books(category_id);
create trigger trg_books_updated_at before update on books
  for each row execute function set_updated_at();

-- ============================================================
-- 9. BOOK_COPIES
-- ============================================================
create table book_copies (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  accession_number text not null unique,
  shelf_id uuid references shelves(id) on delete set null,
  condition text default 'good' check (condition in ('new','good','worn','damaged')),
  status text not null default 'available' check (status in ('available','issued','reserved','lost','damaged','maintenance')),
  purchase_date date,
  purchase_price numeric(10,2)
);
create index idx_copies_book on book_copies(book_id);
create index idx_copies_status on book_copies(status);
create index idx_copies_accession on book_copies(accession_number);

-- ============================================================
-- 10. ISSUES
-- ============================================================
create table issues (
  id uuid primary key default gen_random_uuid(),
  copy_id uuid not null references book_copies(id) on delete restrict,
  member_id uuid not null references members(id) on delete restrict,
  librarian_id uuid references librarians(id) on delete set null,
  issue_date date not null default current_date,
  due_date date not null,
  return_date date,
  status text not null default 'issued' check (status in ('issued','returned','overdue','lost')),
  remarks text,
  created_at timestamptz not null default now()
);
create index idx_issues_copy on issues(copy_id);
create index idx_issues_member on issues(member_id);
create index idx_issues_status on issues(status);

-- ============================================================
-- 11. FINES
-- ============================================================
create table fines (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  reason text not null default 'Late return',
  fine_date date not null default current_date,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','waived')),
  payment_date date
);
create index idx_fines_issue on fines(issue_id);
create index idx_fines_status on fines(payment_status);

-- ============================================================
-- 12. RESERVATIONS
-- ============================================================
create table reservations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  reservation_date date not null default current_date,
  expiry_date date,
  status text not null default 'pending' check (status in ('pending','available','completed','cancelled','expired')),
  created_at timestamptz not null default now()
);
create index idx_reservations_book on reservations(book_id);
create index idx_reservations_member on reservations(member_id);
create index idx_reservations_status on reservations(status);

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('due_soon','overdue','reservation_available','fine_generated','membership_expiry','info')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id);
create index idx_notifications_unread on notifications(user_id, is_read);

-- ============================================================
-- 14. ACTIVITY_LOGS
-- ============================================================
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  module text not null,
  description text,
  created_at timestamptz not null default now()
);
create index idx_activity_user on activity_logs(user_id);
create index idx_activity_created on activity_logs(created_at desc);

-- ============================================================
-- 15. LIBRARY SETTINGS (configurable fine rate, loan period, etc.)
-- ============================================================
create table library_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into library_settings (key, value) values
  ('library_name', 'Smart Library'),
  ('daily_fine_rate', '10'),
  ('max_borrow_limit', '3'),
  ('default_loan_days', '14');

-- ============================================================
-- AUTH TRIGGER: auto-create a profile row whenever someone signs up
-- Expects role/full_name to be passed in auth signup options.data
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RPC: atomic issue book (creates issue + flips copy status + logs)
-- ============================================================
create or replace function issue_book(
  p_copy_id uuid,
  p_member_id uuid,
  p_librarian_id uuid,
  p_due_date date
) returns uuid as $$
declare
  v_issue_id uuid;
  v_copy_status text;
begin
  select status into v_copy_status from book_copies where id = p_copy_id for update;
  if v_copy_status is null then
    raise exception 'Book copy not found';
  end if;
  if v_copy_status <> 'available' then
    raise exception 'This book copy is not available';
  end if;

  insert into issues (copy_id, member_id, librarian_id, due_date)
  values (p_copy_id, p_member_id, p_librarian_id, p_due_date)
  returning id into v_issue_id;

  update book_copies set status = 'issued' where id = p_copy_id;

  insert into activity_logs (user_id, action, module, description)
  values (p_librarian_id, 'Issued Book', 'issues', 'Issue ' || v_issue_id);

  return v_issue_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- RPC: atomic return book (updates issue + flips copy status + fine if overdue)
-- ============================================================
create or replace function return_book(
  p_issue_id uuid
) returns void as $$
declare
  v_copy_id uuid;
  v_due_date date;
  v_overdue_days int;
  v_fine_rate numeric;
begin
  select copy_id, due_date into v_copy_id, v_due_date from issues where id = p_issue_id for update;
  if v_copy_id is null then
    raise exception 'Issue record not found';
  end if;

  update issues set status = 'returned', return_date = current_date where id = p_issue_id;
  update book_copies set status = 'available' where id = v_copy_id;

  v_overdue_days := greatest(current_date - v_due_date, 0);
  if v_overdue_days > 0 then
    select value::numeric into v_fine_rate from library_settings where key = 'daily_fine_rate';
    insert into fines (issue_id, amount, reason)
    values (p_issue_id, v_overdue_days * coalesce(v_fine_rate, 10), 'Late return');
  end if;
end;
$$ language plpgsql security definer;
