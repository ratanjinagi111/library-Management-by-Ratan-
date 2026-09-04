// ============================================================
// BOOKS.JS — logic for books.html
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'books',
  title: 'Books',
  subtitle: 'Browse the catalog and check availability',
});

const COVER_CLASSES = ['', 'c2', 'c3', 'c4'];

contentEl.innerHTML = `
  <div class="toolbar">
    <div class="search-box">
      <i class="ti ti-search"></i>
      <input type="text" id="search-input" placeholder="Search by title, author, or ISBN…">
    </div>
    <select class="filter-select" id="category-filter"><option value="">All categories</option></select>
    <select class="filter-select" id="availability-filter">
      <option value="">All availability</option>
      <option value="available">Available now</option>
    </select>
    <select class="filter-select" id="sort-select">
      <option value="title-asc">Title A–Z</option>
      <option value="title-desc">Title Z–A</option>
      <option value="newest">Newest first</option>
    </select>
    ${isStaff ? `<button class="btn-gradient btn-sm" id="add-book-btn" style="white-space:nowrap;"><i class="ti ti-plus"></i> Add book</button>` : ''}
  </div>

  <div class="book-grid" id="book-grid">
    <div class="empty-state">Loading books…</div>
  </div>

  ${isStaff ? `
  <div class="modal-overlay" id="add-book-modal" hidden>
    <div class="modal">
      <div class="modal__head">
        <h3>Add a book</h3>
        <button class="modal__close" id="close-add-modal">&times;</button>
      </div>
      <form id="add-book-form">
        <div class="field"><label>Title</label><input type="text" name="title" required></div>
        <div class="form-grid">
          <div class="field"><label>ISBN</label><input type="text" name="isbn" required></div>
          <div class="field"><label>Language</label><input type="text" name="language" value="English"></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Author name</label><input type="text" name="author_name" required></div>
          <div class="field"><label>Category</label><input type="text" name="category_name" required></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Publisher</label><input type="text" name="publisher_name"></div>
          <div class="field"><label>Price (₹)</label><input type="number" name="price" min="0" step="0.01"></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Publication year</label><input type="number" name="publication_year" min="1900" max="2100"></div>
          <div class="field"><label>Edition</label><input type="text" name="edition"></div>
        </div>
        <div class="field"><label>Description</label><input type="text" name="description"></div>
        <div class="field-error field-error--form" id="add-book-error"></div>
        <button type="submit" class="btn-gradient btn-block">Add book</button>
      </form>
    </div>
  </div>` : ''}
`;

const grid = document.getElementById('book-grid');
let allRows = [];

async function loadCategories() {
  const { data } = await supabase.from('categories').select('id, category_name').eq('status', 'active').order('category_name');
  const select = document.getElementById('category-filter');
  (data || []).forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.category_name;
    select.appendChild(opt);
  });
}

async function loadBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, isbn, publication_year, created_at, authors(author_name), categories(id, category_name), book_copies(id, status)');

  if (error) {
    grid.innerHTML = `<div class="empty-state">Unable to load books right now.</div>`;
    return;
  }
  allRows = data || [];
  render();
}

function render() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const categoryId = document.getElementById('category-filter').value;
  const availability = document.getElementById('availability-filter').value;
  const sort = document.getElementById('sort-select').value;

  let rows = allRows.filter((b) => {
    const matchesSearch = !search
      || b.title.toLowerCase().includes(search)
      || (b.authors?.author_name || '').toLowerCase().includes(search)
      || b.isbn.toLowerCase().includes(search);
    const matchesCategory = !categoryId || b.categories?.id === categoryId;
    const availableCount = (b.book_copies || []).filter((c) => c.status === 'available').length;
    const matchesAvailability = availability !== 'available' || availableCount > 0;
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  rows = rows.sort((a, b) => {
    if (sort === 'title-asc') return a.title.localeCompare(b.title);
    if (sort === 'title-desc') return b.title.localeCompare(a.title);
    if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    return 0;
  });

  if (rows.length === 0) {
    grid.innerHTML = `<div class="empty-state">No books found. Try a different search or filter.</div>`;
    return;
  }

  grid.innerHTML = rows.map((b, i) => {
    const total = (b.book_copies || []).length;
    const available = (b.book_copies || []).filter((c) => c.status === 'available').length;
    const statusBadge = available > 0
      ? `<span class="badge badge--available">Available</span>`
      : `<span class="badge badge--overdue">Unavailable</span>`;

    return `
      <a href="book-details.html?id=${b.id}" class="book-card">
        <div class="book-card__cover ${COVER_CLASSES[i % 4]}"><i class="ti ti-book-2"></i></div>
        <div class="book-card__body">
          <div class="book-card__title">${escapeHtml(b.title)}</div>
          <div class="book-card__meta">${escapeHtml(b.authors?.author_name || 'Unknown author')}</div>
          <div class="book-card__meta">${escapeHtml(b.categories?.category_name || '—')} · ${escapeHtml(b.isbn)}</div>
          <div class="book-card__foot">
            ${statusBadge}
            <span class="book-card__copies">${available}/${total} copies</span>
          </div>
        </div>
      </a>`;
  }).join('');
}

['search-input', 'category-filter', 'availability-filter', 'sort-select'].forEach((id) => {
  document.getElementById(id).addEventListener('input', render);
  document.getElementById(id).addEventListener('change', render);
});

// -------------------------------------------------------------
// Add book (staff only)
// -------------------------------------------------------------
if (isStaff) {
  const modal = document.getElementById('add-book-modal');
  document.getElementById('add-book-btn').addEventListener('click', () => { modal.hidden = false; });
  document.getElementById('close-add-modal').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  document.getElementById('add-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('add-book-error');
    errorEl.textContent = '';
    const values = Object.fromEntries(new FormData(e.target).entries());

    try {
      // Find-or-create author / category / publisher by name.
      const authorId = await findOrCreate('authors', 'author_name', values.author_name);
      const categoryId = await findOrCreate('categories', 'category_name', values.category_name);
      const publisherId = values.publisher_name ? await findOrCreate('publishers', 'publisher_name', values.publisher_name) : null;

      const { error } = await supabase.from('books').insert({
        title: values.title,
        isbn: values.isbn,
        language: values.language || 'English',
        author_id: authorId,
        category_id: categoryId,
        publisher_id: publisherId,
        price: values.price || null,
        publication_year: values.publication_year || null,
        edition: values.edition || null,
        description: values.description || null,
      });

      if (error) {
        errorEl.textContent = error.message.includes('duplicate') ? 'A book with this ISBN already exists.' : error.message;
        return;
      }

      await logActivity(profile.id, 'Added Book', 'books', values.title);
      showToast('Book added successfully.', 'success');
      modal.hidden = true;
      e.target.reset();
      loadCategories2();
      loadBooks();
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong.';
    }
  });
}

async function findOrCreate(table, column, value) {
  const { data: existing } = await supabase.from(table).select('id').ilike(column, value).limit(1).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase.from(table).insert({ [column]: value }).select('id').single();
  if (error) throw error;
  return created.id;
}

function loadCategories2() {
  document.getElementById('category-filter').innerHTML = '<option value="">All categories</option>';
  loadCategories();
}

loadCategories();
loadBooks();
