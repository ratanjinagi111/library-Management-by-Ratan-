// ============================================================
// FINES.JS — logic for fines.html
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'fines',
  title: 'Fines',
  subtitle: isStaff ? 'All fines across members' : 'Your fines',
});

contentEl.innerHTML = `
  ${isStaff ? `
  <div class="toolbar">
    <select class="filter-select" id="status-filter">
      <option value="">All statuses</option>
      <option value="pending">Pending</option>
      <option value="paid">Paid</option>
      <option value="waived">Waived</option>
    </select>
  </div>` : ''}
  <div class="panel">
    <table class="data-table">
      <thead><tr>
        <th>Book</th>
        ${isStaff ? '<th>Member</th>' : ''}
        <th>Reason</th>
        <th>Amount</th>
        <th>Fine date</th>
        <th>Status</th>
        ${isStaff ? '<th></th>' : ''}
      </tr></thead>
      <tbody id="fines-body"><tr><td colspan="7" class="empty-state">Loading…</td></tr></tbody>
    </table>
  </div>
`;

let memberRow = null;
if (!isStaff) {
  const { data } = await supabase.from('members').select('id').eq('user_id', profile.id).single();
  memberRow = data;
}

async function load() {
  try {
    const query = supabase
      .from('fines')
      .select('id, amount, reason, fine_date, payment_status, issues(book_copies(books(title)), members(profiles(full_name)))')
      .order('fine_date', { ascending: false });

    const { data, error } = await query;
    const tbody = document.getElementById('fines-body');

    if (error) {
      console.error('fines: query failed', error);
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Unable to load fines (${escapeHtml(error.message)}).</td></tr>`;
      return;
    }

    let rows = data || [];

    const statusFilter = isStaff ? document.getElementById('status-filter').value : '';
    if (statusFilter) rows = rows.filter((f) => f.payment_status === statusFilter);

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No fines ${isStaff ? 'recorded' : "— you're all clear"}.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((f) => `
      <tr>
        <td>${escapeHtml(f.issues?.book_copies?.books?.title || '—')}</td>
        ${isStaff ? `<td>${escapeHtml(f.issues?.members?.profiles?.full_name || '—')}</td>` : ''}
        <td>${escapeHtml(f.reason)}</td>
        <td>₹${f.amount}</td>
        <td>${f.fine_date}</td>
        <td><span class="badge ${f.payment_status === 'paid' ? 'badge--available' : f.payment_status === 'waived' ? 'badge--issued' : 'badge--pending'}">${escapeHtml(f.payment_status)}</span></td>
        ${isStaff ? `<td>
          ${f.payment_status === 'pending' ? `
            <button class="btn-secondary btn-sm mark-paid-btn" data-id="${f.id}">Mark paid</button>
            <button class="btn-outline-danger waive-btn" data-id="${f.id}">Waive</button>
          ` : ''}
        </td>` : ''}
      </tr>`).join('');

    if (isStaff) {
      tbody.querySelectorAll('.mark-paid-btn').forEach((btn) => btn.addEventListener('click', () => updateFine(btn.dataset.id, 'paid')));
      tbody.querySelectorAll('.waive-btn').forEach((btn) => btn.addEventListener('click', () => updateFine(btn.dataset.id, 'waived')));
    }
  } catch (err) {
    console.error('fines: unexpected error', err);
    document.getElementById('fines-body').innerHTML =
      `<tr><td colspan="7" class="empty-state">Something went wrong loading fines. Check the browser console for details.</td></tr>`;
  }
}

async function updateFine(id, status) {
  const { error } = await supabase.from('fines').update({
    payment_status: status,
    payment_date: status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
  }).eq('id', id);

  if (error) { showToast('Unable to update this fine.', 'error'); return; }
  await logActivity(profile.id, status === 'paid' ? 'Marked Fine Paid' : 'Waived Fine', 'fines', id);
  showToast(status === 'paid' ? 'Fine marked as paid.' : 'Fine waived.', 'success');
  load();
}

if (isStaff) document.getElementById('status-filter').addEventListener('change', load);

load();
