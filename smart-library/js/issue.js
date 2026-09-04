// ============================================================
// ISSUE.JS — logic for issue.html (staff only)
// Depends on: layout.js, supabase-config.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast, logActivity } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'issue',
  title: 'Issue a book',
  subtitle: 'Select a member and an available copy',
});

if (!isStaff) {
  contentEl.innerHTML = `<div class="empty-state">This page is only available to librarians and admins.</div>`;
  throw new Error('not staff');
}

const { data: librarianRow } = await supabase.from('librarians').select('id').eq('user_id', profile.id).maybeSingle();
const { data: settingsRows } = await supabase.from('library_settings').select('key, value').in('key', ['default_loan_days', 'max_borrow_limit']);
const loanDays = Number(settingsRows?.find((s) => s.key === 'default_loan_days')?.value || 14);
const borrowLimit = Number(settingsRows?.find((s) => s.key === 'max_borrow_limit')?.value || 3);

const preselectBookId = new URLSearchParams(window.location.search).get('bookId');
const defaultDue = new Date(Date.now() + loanDays * 86400000).toISOString().slice(0, 10);

contentEl.innerHTML = `
  <div class="panel" style="padding:24px; max-width:640px;">
    <div class="field">
      <label>1. Find member</label>
      <div class="search-box"><i class="ti ti-search"></i><input type="text" id="member-search" placeholder="Search by name or registration number…"></div>
      <div id="member-results" class="panel" style="margin-top:8px; display:none;"></div>
      <div id="member-selected" style="margin-top:8px; font-size:14px; display:none;">
        Selected: <strong id="member-selected-name"></strong>
        <button type="button" class="link-btn" id="member-clear" style="margin-left:8px;">Change</button>
      </div>
    </div>

    <div class="field" style="margin-top:20px;">
      <label>2. Find an available copy</label>
      <div class="search-box"><i class="ti ti-search"></i><input type="text" id="copy-search" placeholder="Search by book title, ISBN, or accession number…"></div>
      <div id="copy-results" class="panel" style="margin-top:8px; display:none;"></div>
      <div id="copy-selected" style="margin-top:8px; font-size:14px; display:none;">
        Selected: <strong id="copy-selected-label"></strong>
        <button type="button" class="link-btn" id="copy-clear" style="margin-left:8px;">Change</button>
      </div>
    </div>

    <div class="field" style="margin-top:20px; max-width:220px;">
      <label>3. Due date</label>
      <input type="date" id="due-date" value="${defaultDue}">
    </div>

    <div class="field-error field-error--form" id="issue-error" style="margin-top:16px;"></div>

    <button type="button" class="btn-gradient" id="confirm-issue-btn" style="margin-top:12px;" disabled>
      Confirm issue
    </button>
  </div>
`;

let selectedMember = null;
let selectedCopy = null;

function updateConfirmState() {
  document.getElementById('confirm-issue-btn').disabled = !(selectedMember && selectedCopy);
}

// -------------------------------------------------------------
// Member search
// -------------------------------------------------------------
const memberSearchInput = document.getElementById('member-search');
const memberResults = document.getElementById('member-results');

memberSearchInput.addEventListener('input', debounce(async () => {
  const q = memberSearchInput.value.trim();
  if (q.length < 2) { memberResults.style.display = 'none'; return; }

  const { data } = await supabase
    .from('members')
    .select('id, registration_number, status, profiles(full_name, email)')
    .or(`registration_number.ilike.%${q}%`)
    .limit(8);

  // Also search by name client-side since profiles is a join.
  const { data: byName } = await supabase
    .from('members')
    .select('id, registration_number, status, profiles!inner(full_name, email)')
    .ilike('profiles.full_name', `%${q}%`)
    .limit(8);

  const merged = [...(data || []), ...(byName || [])].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  if (merged.length === 0) {
    memberResults.style.display = 'block';
    memberResults.innerHTML = `<div class="empty-state" style="padding:16px;">No members found.</div>`;
    return;
  }

  memberResults.style.display = 'block';
  memberResults.innerHTML = merged.map((m) => `
    <div class="member-option" data-id="${m.id}" data-name="${escapeHtml(m.profiles?.full_name || '')}" data-status="${m.status}"
         style="padding:10px 14px; cursor:pointer; border-bottom:1px solid var(--border); font-size:13.5px;">
      <strong>${escapeHtml(m.profiles?.full_name || 'Unknown')}</strong> — ${escapeHtml(m.registration_number)}
      ${m.status !== 'active' ? '<span class="badge badge--overdue" style="margin-left:6px;">inactive</span>' : ''}
    </div>`).join('');

  memberResults.querySelectorAll('.member-option').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.dataset.status !== 'active') {
        showToast('This member account is inactive.', 'error');
        return;
      }
      selectedMember = { id: el.dataset.id, name: el.dataset.name };
      document.getElementById('member-selected-name').textContent = selectedMember.name;
      document.getElementById('member-selected').style.display = 'block';
      memberResults.style.display = 'none';
      memberSearchInput.value = '';
      memberSearchInput.parentElement.style.display = 'none';
      updateConfirmState();
    });
  });
}, 300));

document.getElementById('member-clear').addEventListener('click', () => {
  selectedMember = null;
  document.getElementById('member-selected').style.display = 'none';
  memberSearchInput.parentElement.style.display = 'block';
  updateConfirmState();
});

// -------------------------------------------------------------
// Copy search
// -------------------------------------------------------------
const copySearchInput = document.getElementById('copy-search');
const copyResults = document.getElementById('copy-results');

async function searchCopies(q) {
  const { data } = await supabase
    .from('book_copies')
    .select('id, accession_number, status, books(title, isbn)')
    .eq('status', 'available')
    .or(`accession_number.ilike.%${q}%,books.title.ilike.%${q}%`)
    .limit(10);
  return data || [];
}

copySearchInput.addEventListener('input', debounce(async () => {
  const q = copySearchInput.value.trim();
  if (q.length < 2) { copyResults.style.display = 'none'; return; }
  renderCopyResults(await searchCopies(q));
}, 300));

function renderCopyResults(rows) {
  if (rows.length === 0) {
    copyResults.style.display = 'block';
    copyResults.innerHTML = `<div class="empty-state" style="padding:16px;">No available copies found.</div>`;
    return;
  }
  copyResults.style.display = 'block';
  copyResults.innerHTML = rows.map((c) => `
    <div class="copy-option" data-id="${c.id}" data-label="${escapeHtml(c.books?.title || 'Untitled')} (${escapeHtml(c.accession_number)})"
         style="padding:10px 14px; cursor:pointer; border-bottom:1px solid var(--border); font-size:13.5px;">
      <strong>${escapeHtml(c.books?.title || 'Untitled')}</strong> — ${escapeHtml(c.accession_number)}
    </div>`).join('');

  copyResults.querySelectorAll('.copy-option').forEach((el) => {
    el.addEventListener('click', () => {
      selectedCopy = { id: el.dataset.id, label: el.dataset.label };
      document.getElementById('copy-selected-label').textContent = selectedCopy.label;
      document.getElementById('copy-selected').style.display = 'block';
      copyResults.style.display = 'none';
      copySearchInput.value = '';
      copySearchInput.parentElement.style.display = 'none';
      updateConfirmState();
    });
  });
}

document.getElementById('copy-clear').addEventListener('click', () => {
  selectedCopy = null;
  document.getElementById('copy-selected').style.display = 'none';
  copySearchInput.parentElement.style.display = 'block';
  updateConfirmState();
});

// Preselect from ?bookId= if arriving from a book details page.
if (preselectBookId) {
  const { data: book } = await supabase.from('books').select('title').eq('id', preselectBookId).single();
  if (book) {
    const { data: copies } = await supabase
      .from('book_copies')
      .select('id, accession_number, books(title)')
      .eq('book_id', preselectBookId)
      .eq('status', 'available')
      .limit(10);
    if (copies?.length) renderCopyResults(copies);
  }
}

// -------------------------------------------------------------
// Confirm issue
// -------------------------------------------------------------
document.getElementById('confirm-issue-btn').addEventListener('click', async () => {
  const btn = document.getElementById('confirm-issue-btn');
  const errorEl = document.getElementById('issue-error');
  errorEl.textContent = '';

  const dueDate = document.getElementById('due-date').value;
  if (!dueDate) { errorEl.textContent = 'Choose a due date.'; return; }

  // Client-side borrow-limit check (best effort; the RPC itself enforces copy availability atomically).
  const { count } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', selectedMember.id)
    .eq('status', 'issued');

  if ((count || 0) >= borrowLimit) {
    errorEl.textContent = `This member has reached the borrowing limit of ${borrowLimit} books.`;
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Issuing…';

  const { error } = await supabase.rpc('issue_book', {
    p_copy_id: selectedCopy.id,
    p_member_id: selectedMember.id,
    p_librarian_id: librarianRow?.id || null,
    p_due_date: dueDate,
  });

  if (error) {
    errorEl.textContent = error.message || 'Unable to issue this book.';
    btn.disabled = false;
    btn.textContent = 'Confirm issue';
    return;
  }

  showToast(`Issued "${selectedCopy.label}" to ${selectedMember.name}.`, 'success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
});

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
