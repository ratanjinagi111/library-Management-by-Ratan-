// ============================================================
// REPORTS.JS — logic for reports.html (staff only)
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase } from './supabase-config.js';

const { isStaff, contentEl } = await initAppShell({
  activeKey: 'reports',
  title: 'Reports',
  subtitle: 'Library activity at a glance',
});

if (!isStaff) {
  contentEl.innerHTML = `<div class="empty-state">This page is only available to librarians and admins.</div>`;
  throw new Error('not staff');
}

contentEl.innerHTML = `
  <h3 class="section-title">Books</h3>
  <div class="stat-grid" id="book-stats"></div>

  <h3 class="section-title">Borrowing</h3>
  <div class="stat-grid" id="borrow-stats"></div>

  <h3 class="section-title">Members &amp; fines</h3>
  <div class="stat-grid" id="member-stats"></div>

  <h3 class="section-title">Books by category</h3>
  <div class="panel bar-chart" id="category-chart"><div class="empty-state">Loading…</div></div>

  <h3 class="section-title">Most borrowed books</h3>
  <div class="panel">
    <table class="data-table">
      <thead><tr><th>Book</th><th>Times borrowed</th></tr></thead>
      <tbody id="popular-body"><tr><td colspan="2" class="empty-state">Loading…</td></tr></tbody>
    </table>
  </div>
`;

function statCard(icon, colorClass, value, label) {
  return `
    <div class="stat-card">
      <div class="stat-card__icon ${colorClass}"><i class="ti ${icon}"></i></div>
      <div class="stat-card__value">${value}</div>
      <div class="stat-card__label">${label}</div>
    </div>`;
}

async function loadBookStats() {
  const [total, lost, damaged, available] = await Promise.all([
    supabase.from('book_copies').select('id', { count: 'exact', head: true }),
    supabase.from('book_copies').select('id', { count: 'exact', head: true }).eq('status', 'lost'),
    supabase.from('book_copies').select('id', { count: 'exact', head: true }).eq('status', 'damaged'),
    supabase.from('book_copies').select('id', { count: 'exact', head: true }).eq('status', 'available'),
  ]);
  document.getElementById('book-stats').innerHTML =
    statCard('ti-copy', 'stat-card__icon--blue', total.count ?? 0, 'Total copies') +
    statCard('ti-circle-check', 'stat-card__icon--emerald', available.count ?? 0, 'Available copies') +
    statCard('ti-alert-triangle', 'stat-card__icon--coral', lost.count ?? 0, 'Lost copies') +
    statCard('ti-tool', 'stat-card__icon--purple', damaged.count ?? 0, 'Damaged copies');
}

async function loadBorrowStats() {
  const [totalIssues, returned, current, overdue] = await Promise.all([
    supabase.from('issues').select('id', { count: 'exact', head: true }),
    supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'returned'),
    supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
    supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'issued').lt('due_date', new Date().toISOString().slice(0, 10)),
  ]);
  document.getElementById('borrow-stats').innerHTML =
    statCard('ti-history', 'stat-card__icon--blue', totalIssues.count ?? 0, 'Total issues (all time)') +
    statCard('ti-circle-check', 'stat-card__icon--emerald', returned.count ?? 0, 'Returned') +
    statCard('ti-arrows-exchange', 'stat-card__icon--purple', current.count ?? 0, 'Currently out') +
    statCard('ti-alert-triangle', 'stat-card__icon--coral', overdue.count ?? 0, 'Overdue');
}

async function loadMemberStats() {
  const [total, active, pendingFines, paidFines] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('fines').select('amount').eq('payment_status', 'pending'),
    supabase.from('fines').select('amount').eq('payment_status', 'paid'),
  ]);
  const pendingTotal = (pendingFines.data || []).reduce((s, f) => s + Number(f.amount), 0);
  const paidTotal = (paidFines.data || []).reduce((s, f) => s + Number(f.amount), 0);

  document.getElementById('member-stats').innerHTML =
    statCard('ti-users', 'stat-card__icon--blue', total.count ?? 0, 'Total members') +
    statCard('ti-user-check', 'stat-card__icon--emerald', active.count ?? 0, 'Active members') +
    statCard('ti-currency-rupee', 'stat-card__icon--coral', `₹${pendingTotal.toLocaleString('en-IN')}`, 'Pending fines') +
    statCard('ti-cash', 'stat-card__icon--purple', `₹${paidTotal.toLocaleString('en-IN')}`, 'Fines collected');
}

async function loadCategoryChart() {
  const { data } = await supabase.from('books').select('categories(category_name)');
  const el = document.getElementById('category-chart');
  if (!data || data.length === 0) {
    el.innerHTML = `<div class="empty-state">No books to chart yet.</div>`;
    return;
  }
  const counts = {};
  data.forEach((b) => {
    const name = b.categories?.category_name || 'Uncategorized';
    counts[name] = (counts[name] || 0) + 1;
  });
  const max = Math.max(...Object.values(counts));
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  el.innerHTML = rows.map(([name, count]) => `
    <div class="bar-row">
      <div class="bar-row__label">${escapeHtml(name)}</div>
      <div class="bar-row__track"><div class="bar-row__fill" style="width:${(count / max) * 100}%"></div></div>
      <div class="bar-row__value">${count}</div>
    </div>`).join('');
}

async function loadPopularBooks() {
  const { data } = await supabase.from('issues').select('book_copies(books(title))');
  const tbody = document.getElementById('popular-body');
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="empty-state">No issue history yet.</td></tr>`;
    return;
  }
  const counts = {};
  data.forEach((row) => {
    const title = row.book_copies?.books?.title;
    if (title) counts[title] = (counts[title] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="empty-state">No issue history yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = top.map(([title, count]) => `
    <tr><td>${escapeHtml(title)}</td><td>${count}</td></tr>`).join('');
}

loadBookStats();
loadBorrowStats();
loadMemberStats();
loadCategoryChart();
loadPopularBooks();
