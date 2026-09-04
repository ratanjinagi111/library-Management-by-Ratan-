// ============================================================
// MY-BORROWINGS.JS — logic for my-borrowings.html (member)
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'my-borrowings',
  title: 'My borrowings',
  subtitle: 'Everything you currently have, and your borrowing history',
});

if (isStaff) {
  contentEl.innerHTML = `<div class="empty-state">This page is for members. Staff can view all issues from the Dashboard or Reports.</div>`;
  throw new Error('staff view not applicable');
}

contentEl.innerHTML = `
  <h3 class="section-title">Currently borrowed</h3>
  <div class="panel">
    <table class="data-table">
      <thead><tr><th>Book</th><th>Issue date</th><th>Due date</th><th>Days remaining</th><th>Status</th></tr></thead>
      <tbody id="current-body"></tbody>
    </table>
  </div>

  <h3 class="section-title">Borrowing history</h3>
  <div class="panel">
    <table class="data-table">
      <thead><tr><th>Book</th><th>Issue date</th><th>Return date</th><th>Status</th></tr></thead>
      <tbody id="history-body"></tbody>
    </table>
  </div>
`;

const { data: memberRow } = await supabase.from('members').select('id').eq('user_id', profile.id).single();

async function load() {
  const localBorrowings = JSON.parse(localStorage.getItem('sl-local-borrowings') || '[]')
    .filter((row) => !row.memberId || row.memberId === profile.id);

  if (!memberRow) {
    document.getElementById('current-body').innerHTML = localBorrowings.length
      ? localBorrowings.map(renderLocalBorrowing).join('')
      : `<tr><td colspan="5" class="empty-state">No books borrowed.</td></tr>`;
    document.getElementById('history-body').innerHTML = `<tr><td colspan="4" class="empty-state">No borrowing history yet.</td></tr>`;
    return;
  }

  const { data: current } = await supabase
    .from('issues')
    .select('id, issue_date, due_date, book_copies(books(title))')
    .eq('member_id', memberRow.id)
    .eq('status', 'issued')
    .order('due_date');

  const today = new Date();

  const currentRows = current || [];
  const currentBody = document.getElementById('current-body');
  if (currentRows.length === 0 && localBorrowings.length === 0) {
    currentBody.innerHTML = `<tr><td colspan="5" class="empty-state">No active borrowings.</td></tr>`;
  } else {
    currentBody.innerHTML = [
      ...currentRows.map((row) => {
      const due = new Date(row.due_date);
      const daysLeft = Math.round((due - today) / 86400000);
      const overdue = daysLeft < 0;
      return `
        <tr>
          <td>${escapeHtml(row.book_copies?.books?.title || '—')}</td>
          <td>${row.issue_date}</td>
          <td>${row.due_date}</td>
          <td>${overdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}</td>
          <td><span class="badge ${overdue ? 'badge--overdue' : 'badge--issued'}">${overdue ? 'Overdue' : 'Issued'}</span></td>
        </tr>`;
      }),
      ...localBorrowings.map(renderLocalBorrowing),
    ].join('');
  }

  const { data: history } = await supabase
    .from('issues')
    .select('id, issue_date, return_date, status, book_copies(books(title))')
    .eq('member_id', memberRow.id)
    .neq('status', 'issued')
    .order('issue_date', { ascending: false })
    .limit(20);

  const historyBody = document.getElementById('history-body');
  if (!history || history.length === 0) {
    historyBody.innerHTML = `<tr><td colspan="4" class="empty-state">No borrowing history yet.</td></tr>`;
  } else {
    historyBody.innerHTML = history.map((row) => `
      <tr>
        <td>${escapeHtml(row.book_copies?.books?.title || '—')}</td>
        <td>${row.issue_date}</td>
        <td>${row.return_date || '—'}</td>
        <td><span class="badge badge--available">${escapeHtml(row.status)}</span></td>
      </tr>`).join('');
  }
}

load();

function renderLocalBorrowing(row) {
  const due = new Date(row.dueDate);
  const daysLeft = Math.round((due - new Date()) / 86400000);
  const overdue = daysLeft < 0;
  return `
    <tr>
      <td>${escapeHtml(row.title)}</td>
      <td>${escapeHtml(row.issueDate)}</td>
      <td>${escapeHtml(row.dueDate)}</td>
      <td>${overdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}</td>
      <td><span class="badge ${overdue ? 'badge--overdue' : 'badge--issued'}">${overdue ? 'Overdue' : 'Issued'}</span></td>
    </tr>`;
}
