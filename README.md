# Smart Library — setup steps

Your Supabase project is already wired into `js/supabase-config.js` (URL + anon key).

## 1. Run the database SQL
In your Supabase project → SQL Editor, run these three files **in order**:
1. `database/schema.sql` — creates all 14 tables, indexes, and the atomic issue/return functions
2. `database/rls_policies.sql` — locks every table down with role-based Row Level Security
3. `database/sample_data.sql` — seeds categories, publishers, authors, shelves, books, and copies

## 2. Enable email auth
In Supabase → Authentication → Providers, make sure **Email** is enabled. For development, you can turn off "Confirm email" under Authentication → Settings so signups work instantly without an inbox.

## 3. Create your first admin
Sign-up through the app only creates **members**. To get an admin or librarian account:
1. In Supabase Authentication → Users, create `ratanjinagi999@gmail.com` with its password.
2. Run `database/admin_account.sql` in the SQL Editor to assign that account the `admin` role.
3. Sign in through the shared login page. Admins and librarians receive the staff panel; all other accounts receive the member/student panel.

## 4. Open the site
This is a static HTML/CSS/JS site — no build step. Open `index.html` directly, or serve the folder with any static server (e.g. `npx serve .`).

## What's built so far
- Full schema (14 tables + `library_settings`), constraints, indexes
- RLS policies for admin / librarian / member
- `issue_book()` and `return_book()` Postgres functions for atomic, race-safe operations (used instead of raw multi-step inserts from the frontend)
- `js/supabase-config.js` — client + session/role helpers, toast, activity logging
- `js/auth.js` — login, member self-signup, logout, password reset

## Next up
Shared UI shell (sidebar/topbar), the landing page, login page, dashboard, and each module (books, issue/return, reservations, fines, reports) — built page by page from here.
