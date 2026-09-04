// ============================================================
// MEMBERS.JS — logic for members.html (staff only)
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'members',
  title: 'Members',
  subtitle: 'Registered library members',
});

if (!isStaff) {
  contentEl.innerHTML = `<div class="empty-state">This page is only available to librarians and admins.</div>`;
  throw new Error('not staff');
}

contentEl.innerHTML = `
  <div class="toolbar">
    <div class="search-box">
      <i class="ti ti-search"></i>
      <input type="text" id="search-input" placeholder="Search by name, registration number, or department…">
    </div>
    <select class="filter-select" id="status-filter">
      <option value="">All statuses</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>
  <p style="font-size:13px; color:var(--text-muted); margin:-8px 0 16px;">
    New members register themselves from the <a href="signup.html">sign-up page</a>. Staff can review, activate, or deactivate accounts here.
  </p>
  <div class="panel">
    <table class="data-table">
      <thead><tr><th>Name</th><th>Reg. number</th><th>Department</th><th>Semester</th><th>Email</th><th>Status</th><th></th></tr></thead>
      <tbody id="members-body"><tr><td colspan="7" class="empty-state">Loading members…</td></tr></tbody>
    </table>
  </div>
`;

let allRows = [];

async function loadMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('id, registration_number, department, semester, status, profiles(id, full_name, email)')
    .order('registration_date', { ascending: false });

  if (error) {
    document.getElementById('members-body').innerHTML = `<tr><td colspan="7" class="empty-state">Unable to load members.</td></tr>`;
    return;
  }
  allRows = data || [];
  render();
}

function render() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const status = document.getElementById('status-filter').value;

  const rows = allRows.filter((m) => {
    const name = m.profiles?.full_name || '';
    const matchesSearch = !search
      || name.toLowerCase().includes(search)
      || m.registration_number.toLowerCase().includes(search)
      || (m.department || '').toLowerCase().includes(search);
    const matchesStatus = !status || m.status === status;
    return matchesSearch && matchesStatus;
  });

  const tbody = document.getElementById('members-body');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No members found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((m) => `
    <tr>
      <td>${escapeHtml(m.profiles?.full_name || '—')}</td>
      <td>${escapeHtml(m.registration_number)}</td>
      <td>${escapeHtml(m.department || '—')}</td>
      <td>${m.semester || '—'}</td>
      <td>${escapeHtml(m.profiles?.email || '—')}</td>
      <td><span class="badge ${m.status === 'active' ? 'badge--available' : 'badge--overdue'}">${escapeHtml(m.status)}</span></td>
      <td>
        <button class="btn-outline-danger toggle-status-btn" data-id="${m.id}" data-status="${m.status}">
          ${m.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>`).join('');

  document.querySelectorAll('.toggle-status-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status === 'active' ? 'inactive' : 'active';
      btn.disabled = true;
      const { error } = await supabase.from('members').update({ status: newStatus }).eq('id', btn.dataset.id);
      if (error) {
        showToast('Unable to update member status.', 'error');
        btn.disabled = false;
        return;
      }
      await logActivity(profile.id, newStatus === 'active' ? 'Activated Member' : 'Deactivated Member', 'members', btn.dataset.id);
      showToast(`Member ${newStatus === 'active' ? 'activated' : 'deactivated'}.`, 'success');
      loadMembers();
    });
  });
}

document.getElementById('search-input').addEventListener('input', render);
document.getElementById('status-filter').addEventListener('change', render);

loadMembers();
