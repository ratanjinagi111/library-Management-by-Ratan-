// ============================================================
// RESERVATIONS.JS — logic for reservations.html
// Member: sees own reservations, can cancel.
// Staff: sees all reservations, can update status.
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'reservations',
  title: 'Reservations',
  subtitle: isStaff ? 'All reservation requests' : 'Books you have reserved',
});

contentEl.innerHTML = `
  <div class="panel">
    <table class="data-table">
      <thead><tr>
        <th>Book</th>
        ${isStaff ? '<th>Member</th>' : ''}
        <th>Reserved on</th>
        <th>Expires</th>
        <th>Status</th>
        <th></th>
      </tr></thead>
      <tbody id="reservations-body"><tr><td colspan="6" class="empty-state">Loading…</td></tr></tbody>
    </table>
  </div>
`;

let memberRow = null;
if (!isStaff) {
  const { data, error: memberError } = await supabase.from('members').select('id').eq('user_id', profile.id).single();
  if (memberError) console.error('reservations: failed to load member row', memberError);
  memberRow = data;
}

const STATUS_OPTIONS = ['pending', 'available', 'completed', 'cancelled', 'expired'];

async function load() {
  try {
    let query = supabase
      .from('reservations')
      .select('id, reservation_date, expiry_date, status, books(title), members(profiles(full_name))')
      .order('reservation_date', { ascending: false });

    if (!isStaff) {
      if (!memberRow) {
        document.getElementById('reservations-body').innerHTML =
          `<tr><td colspan="6" class="empty-state">Unable to find your member record. Try logging out and back in.</td></tr>`;
        return;
      }
      query = query.eq('member_id', memberRow.id);
    }

    const { data, error } = await query;
    const tbody = document.getElementById('reservations-body');

    if (error) {
      console.error('reservations: query failed', error);
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Unable to load reservations (${escapeHtml(error.message)}).</td></tr>`;
      return;
    }
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No reservations ${isStaff ? 'yet' : "— reserve a book from its details page when it's unavailable"}.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((r) => `
      <tr>
        <td>${escapeHtml(r.books?.title || '—')}</td>
        ${isStaff ? `<td>${escapeHtml(r.members?.profiles?.full_name || '—')}</td>` : ''}
        <td>${r.reservation_date}</td>
        <td>${r.expiry_date || '—'}</td>
        <td>
          ${isStaff
            ? `<select class="filter-select status-select" data-id="${r.id}">
                ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
              </select>`
            : `<span class="badge ${r.status === 'pending' ? 'badge--pending' : r.status === 'available' ? 'badge--available' : 'badge--overdue'}">${escapeHtml(r.status)}</span>`}
        </td>
        <td>
          ${(!isStaff && r.status === 'pending') ? `<button class="btn-outline-danger cancel-btn" data-id="${r.id}">Cancel</button>` : ''}
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.status-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const { error: updError } = await supabase.from('reservations').update({ status: sel.value }).eq('id', sel.dataset.id);
        if (updError) { showToast('Unable to update reservation.', 'error'); return; }
        await logActivity(profile.id, 'Updated Reservation', 'reservations', sel.dataset.id);
        showToast('Reservation updated.', 'success');
      });
    });

    tbody.querySelectorAll('.cancel-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { error: updError } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', btn.dataset.id);
        if (updError) { showToast('Unable to cancel reservation.', 'error'); btn.disabled = false; return; }
        showToast('Reservation cancelled.', 'success');
        load();
      });
    });
  } catch (err) {
    console.error('reservations: unexpected error', err);
    document.getElementById('reservations-body').innerHTML =
      `<tr><td colspan="6" class="empty-state">Something went wrong loading reservations. Check the browser console for details.</td></tr>`;
  }
}

load();
