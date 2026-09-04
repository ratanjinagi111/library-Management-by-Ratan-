// ============================================================
// INDEX.JS — logic for index.html (public landing page)
// Depends on: supabase-config.js
// No auth guard here — this page is public.
// ============================================================

import { supabase } from './supabase-config.js';

function setStat(id, value) {
  const el = document.getElementById(id);
  el.textContent = value;
  el.classList.remove('skeleton');
}

async function loadStats() {
  const { data, error } = await supabase.rpc('public_library_stats');
  if (error || !data) return; // leave placeholders rather than showing a wrong number
  setStat('stat-books', data.total_books ?? 0);
  setStat('stat-available', data.available_copies ?? 0);
  setStat('stat-members', data.registered_members ?? 0);
  setStat('stat-issued', data.books_issued ?? 0);
}

loadStats();
