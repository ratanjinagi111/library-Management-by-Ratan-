// ============================================================
// BOOK-DETAILS.JS — logic for book-details.html?id=<book_id>
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'books',
  title: 'Book details',
  subtitle: 'Full record, copies, and availability',
});

const bookId = new URLSearchParams(window.location.search).get('id');

if (!bookId) {
  contentEl.innerHTML = `<div class="empty-state">No book specified. <a href="books.html">Back to books</a></div>`;
  throw new Error('missing id');
}

const { data: book, error } = await supabase
  .from('books')
  .select('*, authors(author_name), categories(category_name), publishers(publisher_name)')
  .eq('id', bookId)
  .single();

if (error || !book) {
  contentEl.innerHTML = `<div class="empty-state">Book not found. <a href="books.html">Back to books</a></div>`;
  throw new Error('book not found');
}

const { data: copies } = await supabase
  .from('book_copies')
  .select('id, accession_number, condition, status, shelves(shelf_code, shelf_name)')
  .eq('book_id', bookId)
  .order('accession_number');

const total = (copies || []).length;
const available = (copies || []).filter((c) => c.status === 'available').length;
const issued = (copies || []).filter((c) => c.status === 'issued').length;

let memberRow = null;
if (!isStaff) {
  const { data } = await supabase.from('members').select('id').eq('user_id', profile.id).single();
  memberRow = data;
}

const reserveParams = new URLSearchParams({
  id: bookId,
  memberId: profile.id,
  title: book.title,
  author: book.authors?.author_name || 'Unknown author',
});

contentEl.innerHTML = `
  <div class="detail-header">
    <div class="detail-cover"><i class="ti ti-book-2"></i></div>
    <div class="detail-info">
      <h2>${escapeHtml(book.title)}</h2>
      <div class="detail-info__meta">
        ${escapeHtml(book.authors?.author_name || 'Unknown author')} ·
        ${escapeHtml(book.categories?.category_name || '—')} ·
        ISBN ${escapeHtml(book.isbn)}
        ${book.publishers?.publisher_name ? ' · ' + escapeHtml(book.publishers.publisher_name) : ''}
        ${book.publication_year ? ' · ' + book.publication_year : ''}
        ${book.edition ? ' · ' + escapeHtml(book.edition) + ' ed.' : ''}
        · ${escapeHtml(book.language || 'English')}
      </div>
      ${book.description ? `<p class="detail-info__desc">${escapeHtml(book.description)}</p>` : ''}

      <div class="availability-grid">
        <div class="stat-card"><div class="stat-card__value">${total}</div><div class="stat-card__label">Total copies</div></div>
        <div class="stat-card"><div class="stat-card__value">${available}</div><div class="stat-card__label">Available</div></div>
        <div class="stat-card"><div class="stat-card__value">${issued}</div><div class="stat-card__label">Issued</div></div>
      </div>

      <div class="detail-actions">
        ${!isStaff ? `<a class="btn-gradient" href="reserve.html?${reserveParams.toString()}" title="Reserve this book" style="text-decoration:none;">
          <i class="ti ti-bookmark"></i> Reserve this book
        </a>` : ''}
        ${isStaff && available > 0 ? `<a href="issue.html?bookId=${book.id}" class="btn-gradient" style="text-decoration:none;"><i class="ti ti-arrow-up-right"></i> Issue a copy</a>` : ''}
      </div>
    </div>
  </div>

  <h3 class="section-title">Copies</h3>
  <div class="panel">
    <table class="data-table">
      <thead><tr><th>Accession No.</th><th>Shelf</th><th>Condition</th><th>Status</th></tr></thead>
      <tbody id="copies-body">
        ${(copies || []).length === 0
          ? `<tr><td colspan="4" class="empty-state">No copies recorded for this book yet.</td></tr>`
          : copies.map((c) => `
            <tr>
              <td>${escapeHtml(c.accession_number)}</td>
              <td>${escapeHtml(c.shelves ? `${c.shelves.shelf_code} — ${c.shelves.shelf_name || ''}` : '—')}</td>
              <td style="text-transform:capitalize;">${escapeHtml(c.condition)}</td>
              <td><span class="badge ${c.status === 'available' ? 'badge--available' : c.status === 'issued' ? 'badge--issued' : 'badge--pending'}">${escapeHtml(c.status)}</span></td>
            </tr>`).join('')}
      </tbody>
    </table>
  </div>
`;

