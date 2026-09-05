// ============================================================
// RESERVATIONS.JS — logic for reservations.html
// Member: sees own reservations, can cancel.
// Staff: sees all reservations, can update status.
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';
import { getBookImage } from './book-images.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'reservations',
  title: 'Reservations',
  subtitle: 'Manage book reservations',
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
  const { data: members, error: memberError } = await supabase.from('members').select('id').eq('user_id', profile.id).limit(1);
  if (memberError) console.error('reservations: failed to load member row', memberError);
  memberRow = members?.[0] || null;
}

async function load() {
  try {
    let query = supabase
      .from('reservations')
      .select('id, reservation_date, expiry_date, status, books(title, isbn, authors(author_name), categories(category_name)), members(profiles(full_name))')
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
        <td>
          <div class="reservation-book">
            <img src="${getBookImage(r.books?.title)}" alt="${escapeHtml(r.books?.title || 'Book')} cover" onerror="this.onerror=null;this.src='assets/books/book-placeholder.svg';">
            <div>
              <strong>${escapeHtml(r.books?.title || '—')}</strong>
              <span>${escapeHtml(r.books?.authors?.author_name || 'Unknown author')}</span>
              <small>${escapeHtml(r.books?.categories?.category_name || '—')} · ISBN ${escapeHtml(r.books?.isbn || '—')}</small>
            </div>
          </div>
        </td>
        ${isStaff ? `<td>${escapeHtml(r.members?.profiles?.full_name || '—')}</td>` : ''}
        <td>${r.reservation_date}</td>
        <td>${r.expiry_date || '—'}</td>
        <td>
          ${isStaff
            ? r.status === 'pending'
              ? `<button class="btn-gradient btn-sm accept-btn" data-id="${r.id}" data-due-date="${r.expiry_date || ''}">Accept</button>`
              : `<span class="badge ${r.status === 'accepted' ? 'badge--available' : 'badge--overdue'}">${escapeHtml(r.status)}</span>`
            : `<span class="badge ${r.status === 'pending' ? 'badge--pending' : r.status === 'accepted' ? 'badge--available' : 'badge--overdue'}">${escapeHtml(r.status)}</span>`}
        </td>
        <td>
          ${(!isStaff && r.status === 'pending') ? `<button class="btn-outline-danger cancel-btn" data-id="${r.id}">Cancel</button>` : ''}
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.accept-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const { error: acceptError } = await supabase.rpc('accept_reservation', {
          p_reservation_id: button.dataset.id,
          p_due_date: button.dataset.dueDate || null,
        });
        if (acceptError) {
          showToast(acceptError.message || 'Unable to accept reservation.', 'error');
          button.disabled = false;
          return;
        }
        await logActivity(profile.id, 'Accepted Reservation', 'reservations', button.dataset.id);
        showToast('Reservation accepted and added to member borrowings.', 'success');
        load();
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
