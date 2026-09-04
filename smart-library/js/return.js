// ============================================================
// RETURN.JS — logic for return.html (staff only)
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'return',
  title: 'Return a book',
  subtitle: 'Search an issued copy to check it back in',
});

if (!isStaff) {
  contentEl.innerHTML = `<div class="empty-state">This page is only available to librarians and admins.</div>`;
  throw new Error('not staff');
}

const { data: settingsRows } = await supabase.from('library_settings').select('key, value').eq('key', 'daily_fine_rate').single();
const fineRate = Number(settingsRows?.value || 10);

contentEl.innerHTML = `
  <div class="toolbar">
    <div class="search-box">
      <i class="ti ti-search"></i>
      <input type="text" id="search-input" placeholder="Search by accession number, book title, or member name…">
    </div>
  </div>
  <div class="panel">
    <table class="data-table">
      <thead><tr><th>Book</th><th>Member</th><th>Issue date</th><th>Due date</th><th>Overdue</th><th>Est. fine</th><th></th></tr></thead>
      <tbody id="issues-body"><tr><td colspan="7" class="empty-state">Search above to find an issued book.</td></tr></tbody>
    </table>
  </div>
`;

const tbody = document.getElementById('issues-body');

async function search(q) {
  if (q.length < 2) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Search above to find an issued book.</td></tr>`;
    return;
  }

  const { data, error } = await supabase
    .from('issues')
    .select('id, issue_date, due_date, book_copies(accession_number, books(title)), members(profiles(full_name))')
    .eq('status', 'issued')
    .limit(20);

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Unable to search right now.</td></tr>`;
    return;
  }

  const ql = q.toLowerCase();
  const filtered = (data || []).filter((row) =>
    row.book_copies?.accession_number?.toLowerCase().includes(ql)
    || row.book_copies?.books?.title?.toLowerCase().includes(ql)
    || row.members?.profiles?.full_name?.toLowerCase().includes(ql)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching issued books found.</td></tr>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = filtered.map((row) => {
    const overdueDays = Math.max(0, Math.round((new Date(today) - new Date(row.due_date)) / 86400000));
    const estFine = overdueDays * fineRate;
    return `
      <tr>
        <td>${escapeHtml(row.book_copies?.books?.title || '—')}<br><span style="color:var(--text-muted); font-size:12px;">${escapeHtml(row.book_copies?.accession_number || '')}</span></td>
        <td>${escapeHtml(row.members?.profiles?.full_name || '—')}</td>
        <td>${row.issue_date}</td>
        <td>${row.due_date}</td>
        <td>${overdueDays > 0 ? `<span class="badge badge--overdue">${overdueDays} days</span>` : `<span class="badge badge--available">On time</span>`}</td>
        <td>${estFine > 0 ? '₹' + estFine : '—'}</td>
        <td><button class="btn-gradient btn-sm return-btn" data-id="${row.id}" data-title="${escapeHtml(row.book_copies?.books?.title || '')}">Return</button></td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.return-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Returning…';
      const { error: rpcError } = await supabase.rpc('return_book', { p_issue_id: btn.dataset.id });
      if (rpcError) {
        showToast(rpcError.message || 'Unable to return this book.', 'error');
        btn.disabled = false;
        btn.textContent = 'Return';
        return;
      }
      await logActivity(profile.id, 'Returned Book', 'issues', btn.dataset.title);
      showToast(`"${btn.dataset.title}" returned successfully.`, 'success');
      search(document.getElementById('search-input').value.trim());
    });
  });
}

document.getElementById('search-input').addEventListener('input', debounce((e) => search(e.target.value.trim()), 300));

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
