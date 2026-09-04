-- Run this after creating the administrator in Supabase Authentication.
-- The password belongs in Supabase Auth, never in frontend code or SQL files.

update public.profiles
set role = 'admin', status = 'active'
where lower(email) = 'ratanjinagi999@gmail.com';

-- Verify the account before signing in:
select email, role, status
from public.profiles
where lower(email) = 'ratanjinagi999@gmail.com';