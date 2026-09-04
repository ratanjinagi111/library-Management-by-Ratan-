// ============================================================
// DASHBOARD.JS — logic for dashboard.html
// Renders two different layouts depending on role, matching the
// uploaded admin-dashboard / student-dashboard reference designs.
// Every number here comes from Supabase — nothing hard-coded.
// Depends on: layout.js, supabase-config.js, auth.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase } from './supabase-config.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'dashboard',
  title: 'Dashboard',
  subtitle: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
});

document.querySelector('.topbar__title h1').textContent = `Welcome back, ${profile.full_name.split(' ')[0]}`;

const PALETTE = ['#2A52BE', '#10B981', '#7C3AED', '#F97362', '#CBD1DC'];
let borrowingTimer;

isStaff ? renderStaffDashboard() : renderMemberDashboard();

// ============================================================
// STAFF (ADMIN/LIBRARIAN) DASHBOARD
// ============================================================
async function renderStaffDashboard() {
  contentEl.innerHTML = `
    <div class="kpi-grid" id="kpi-grid">${kpiSkeleton(7)}</div>

    <div class="dash-grid-main">
      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Issues &amp; Returns — last 7 days</h3></div>
        <div class="chart-legend">
          <span><i class="dot" style="background:${PALETTE[0]}"></i>Books issued</span>
          <span><i class="dot" style="background:${PALETTE[1]}"></i>Books returned</span>
        </div>
        <div class="chart-svg-wrap" id="line-chart"><div class="empty-state">Loading…</div></div>
      </div>

      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Books by category</h3></div>
        <div id="donut-wrap"><div class="empty-state">Loading…</div></div>
      </div>

      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Overdue books</h3><a href="reports.html" class="link-btn" style="font-size:11px;">View all</a></div>
        <ul class="overdue-list" id="overdue-list"><li class="empty-state">Loading…</li></ul>
      </div>

      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Pending fines</h3></div>
        <ul class="overdue-list" id="pending-fines-list"><li class="empty-state">Loading…</li></ul>
      </div>
    </div>

    <div class="bottom" style="grid-template-columns:1.6fr 1fr;">
      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Recent activity</h3></div>
        <ul class="activity-list" id="activity-list"><li class="empty-state">Loading…</li></ul>
      </div>
      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Top members <small style="font-weight:400;color:var(--text-muted);">by books issued</small></h3></div>
        <ul class="members-list" id="members-list"><li class="empty-state">Loading…</li></ul>
      </div>
    </div>
  `;

  loadStaffKpis();
  loadLineChart();
  loadCategoryDonut();
  loadOverdueList();
  loadPendingFines();
  loadActivityList(null);
  loadTopMembers();
}

function kpiSkeleton(n) {
  return Array.from({ length: n }).map(() => `
    <div class="card kpi-card">
      <div class="kpi-icon kpi-icon--blue"><i class="ti ti-loader-2"></i></div>
      <div><div class="kpi-label">Loading…</div><div class="kpi-value skeleton">—</div></div>
    </div>`).join('');
}

async function loadStaffKpis() {
  const today = new Date().toISOString().slice(0, 10);
  const [totalBooks, availableCopies, issuedCopies, overdue, members, pendingFines, activeReservations] = await Promise.all([
    supabase.from('books').select('id', { count: 'exact', head: true }),
    supabase.from('book_copies').select('id', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('book_copies').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
    supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'issued').lt('due_date', today),
    supabase.from('members').select('id', { count: 'exact', head: true }),
    supabase.from('fines').select('amount').eq('payment_status', 'pending'),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const pendingTotal = (pendingFines.data || []).reduce((s, f) => s + Number(f.amount), 0);

  const cards = [
    { icon: 'ti-books', color: 'blue', label: 'Total books', value: totalBooks.count ?? 0 },
    { icon: 'ti-circle-check', color: 'green', label: 'Available copies', value: availableCopies.count ?? 0 },
    { icon: 'ti-arrows-exchange', color: 'purple', label: 'Books issued', value: issuedCopies.count ?? 0 },
    { icon: 'ti-alert-triangle', color: 'orange', label: 'Overdue books', value: overdue.count ?? 0 },
    { icon: 'ti-users', color: 'blue', label: 'Registered members', value: members.count ?? 0 },
    { icon: 'ti-currency-rupee', color: 'orange', label: 'Pending fines', value: `₹${pendingTotal.toLocaleString('en-IN')}` },
    { icon: 'ti-bookmark', color: 'purple', label: 'Active reservations', value: activeReservations.count ?? 0 },
  ];

  document.getElementById('kpi-grid').innerHTML = cards.map((c) => `
    <div class="card kpi-card">
      <div class="kpi-icon kpi-icon--${c.color}"><i class="ti ${c.icon}"></i></div>
      <div>
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.value}</div>
      </div>
    </div>`).join('');
}

async function loadLineChart() {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const [issuedRows, returnedRows] = await Promise.all([
    supabase.from('issues').select('issue_date').gte('issue_date', days[0]),
    supabase.from('issues').select('return_date').eq('status', 'returned').gte('return_date', days[0]),
  ]);

  const issuedCounts = days.map((d) => (issuedRows.data || []).filter((r) => r.issue_date === d).length);
  const returnedCounts = days.map((d) => (returnedRows.data || []).filter((r) => r.return_date === d).length);

  const wrap = document.getElementById('line-chart');
  const total = issuedCounts.reduce((a, b) => a + b, 0) + returnedCounts.reduce((a, b) => a + b, 0);

  if (total === 0) {
    wrap.innerHTML = `<div class="empty-state">No issue/return activity in the last 7 days yet.</div>`;
    return;
  }

  const maxVal = Math.max(1, ...issuedCounts, ...returnedCounts);
  const w = 600, h = 220, padL = 36, padR = 16, padT = 16, padB = 30;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  const toPoints = (arr) => arr.map((v, i) => {
    const x = padL + (i / (arr.length - 1)) * plotW;
    const y = padT + plotH - (v / maxVal) * plotH;
    return [x, y];
  });

  const issuedPts = toPoints(issuedCounts);
  const returnedPts = toPoints(returnedCounts);
  const toPath = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
  const toCircles = (pts, color) => pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"/>`).join('');
  const labels = days.map((d, i) => {
    const x = padL + (i / (days.length - 1)) * plotW;
    const label = new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    return `<text x="${x.toFixed(1)}" y="${h - 8}" font-size="10" fill="#7c88a0" text-anchor="middle">${label}</text>`;
  }).join('');
  const gridLines = Array.from({ length: 4 }).map((_, i) => {
    const y = padT + (i / 3) * plotH;
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="#e9edf5" stroke-width="1"/>`;
  }).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <g>${gridLines}</g>
      <path d="${toPath(issuedPts)}" fill="none" stroke="${PALETTE[0]}" stroke-width="2.5"/>
      <path d="${toPath(returnedPts)}" fill="none" stroke="${PALETTE[1]}" stroke-width="2.5"/>
      ${toCircles(issuedPts, PALETTE[0])}
      ${toCircles(returnedPts, PALETTE[1])}
      ${labels}
    </svg>`;
}

async function loadCategoryDonut() {
  const { data } = await supabase.from('books').select('categories(category_name)');
  const wrap = document.getElementById('donut-wrap');

  if (!data || data.length === 0) {
    wrap.innerHTML = `<div class="empty-state">No books to chart yet.</div>`;
    return;
  }

  const counts = {};
  data.forEach((b) => {
    const name = b.categories?.category_name || 'Uncategorized';
    counts[name] = (counts[name] || 0) + 1;
  });

  const total = data.length;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const rows = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((s, [, c]) => s + c, 0);
  if (rest > 0) rows.push(['Others', rest]);

  let cursor = 0;
  const segments = rows.map(([name, count], i) => {
    const pct = (count / total) * 100;
    const start = cursor;
    cursor += pct;
    return `${PALETTE[i % PALETTE.length]} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
  }).join(', ');

  wrap.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${segments})"></div>
      <div class="donut-legend">
        ${rows.map(([name, count], i) => `
          <div class="donut-legend-row">
            <span><i class="dot" style="background:${PALETTE[i % PALETTE.length]}"></i>${escapeHtml(name)}</span>
            <strong>${Math.round((count / total) * 100)}%</strong>
          </div>`).join('')}
      </div>
    </div>
    <small style="color:var(--text-muted);">Total: ${total} books</small>
  `;
}

async function loadOverdueList() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('issues')
    .select('due_date, book_copies(books(title)), members(profiles(full_name))')
    .eq('status', 'issued')
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(5);

  const list = document.getElementById('overdue-list');
  if (!data || data.length === 0) {
    list.innerHTML = `<li class="empty-state">No overdue books right now.</li>`;
    return;
  }

  list.innerHTML = data.map((row) => {
    const days = Math.round((new Date(today) - new Date(row.due_date)) / 86400000);
    return `
      <li>
        <div class="mini-cover"></div>
        <div class="mini-info">
          <b>${escapeHtml(row.book_copies?.books?.title || '—')}</b>
          <small>${escapeHtml(row.members?.profiles?.full_name || '—')}</small>
        </div>
        <span class="days-badge">${days} days</span>
      </li>`;
  }).join('');
}

async function loadPendingFines() {
  const { data } = await supabase
    .from('fines')
    .select('amount, reason, fine_date, issues(book_copies(books(title)), members(profiles(full_name)))')
    .eq('payment_status', 'pending')
    .order('fine_date', { ascending: false })
    .limit(5);

  const list = document.getElementById('pending-fines-list');
  if (!data || data.length === 0) {
    list.innerHTML = `<li class="empty-state">No pending fines.</li>`;
    return;
  }

  list.innerHTML = data.map((row) => `
    <li>
      <div class="mini-cover"></div>
      <div class="mini-info">
        <b>${escapeHtml(row.issues?.book_copies?.books?.title || '—')}</b>
        <small>${escapeHtml(row.issues?.members?.profiles?.full_name || '—')} · ${escapeHtml(row.reason)}</small>
      </div>
      <span class="days-badge">₹${Number(row.amount).toLocaleString('en-IN')}</span>
    </li>`).join('');
}

async function loadActivityList(userId) {
  let query = supabase.from('activity_logs').select('action, description, created_at').order('created_at', { ascending: false }).limit(5);
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;

  const list = document.getElementById('activity-list');
  if (!data || data.length === 0) {
    list.innerHTML = `<li class="empty-state">No recent activity yet.</li>`;
    return;
  }

  list.innerHTML = data.map((row) => `
    <li>
      <span class="activity-icon"><i class="ti ti-activity"></i></span>
      <span>${escapeHtml(row.action)}${row.description ? ' — ' + escapeHtml(row.description) : ''}</span>
      <span class="activity-time">${timeAgo(row.created_at)}</span>
    </li>`).join('');
}

async function loadTopMembers() {
  const { data } = await supabase.from('issues').select('members(id, profiles(full_name))');
  const list = document.getElementById('members-list');

  if (!data || data.length === 0) {
    list.innerHTML = `<li class="empty-state">No issue history yet.</li>`;
    return;
  }

  const counts = {};
  data.forEach((row) => {
    const name = row.members?.profiles?.full_name;
    if (name) counts[name] = (counts[name] || 0) + 1;
  });

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length === 0) {
    list.innerHTML = `<li class="empty-state">No issue history yet.</li>`;
    return;
  }

  list.innerHTML = top.map(([name, count], i) => `
    <li>
      <span class="member-rank">${i + 1}</span>
      <span class="member-avatar-sm">${initials(name)}</span>
      <span class="member-name">${escapeHtml(name)}</span>
      <span class="books-count-badge">${count} books</span>
    </li>`).join('');
}

// ============================================================
// MEMBER DASHBOARD
// ============================================================
async function renderMemberDashboard() {
  contentEl.innerHTML = `
    <div class="stat-grid" id="member-stats">${kpiSkeletonSimple(4)}</div>

    <div class="dash-grid-main">
      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Currently borrowed</h3></div>
        <ul class="borrowed-list" id="borrowed-list"><li class="empty-state">Loading…</li></ul>
      </div>

      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Book reserved</h3></div>
        <div id="reservation-box"><div class="empty-state">Loading…</div></div>
      </div>

      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Notifications</h3></div>
        <ul class="notice-list" id="notice-list"><li class="empty-state">Loading…</li></ul>
      </div>
    </div>

    <div class="bottom" style="grid-template-columns:1.6fr 1fr 1.05fr;">
      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Recent activity</h3></div>
        <ul class="activity-list" id="activity-list"><li class="empty-state">Loading…</li></ul>
      </div>

      <div class="panel panel-pad fine-summary" id="fine-summary">
        <div class="empty-state">Loading…</div>
      </div>

      <div class="panel panel-pad">
        <div class="panel-head-row"><h3>Quick actions</h3></div>
        <div class="quick-actions-grid">
          <a href="books.html" class="quick-action-btn" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none;"><span class="quick-action-icon"><i class="ti ti-search"></i></span>Search books</a>
          <a href="my-borrowings.html" class="quick-action-btn" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none;"><span class="quick-action-icon"><i class="ti ti-book-2"></i></span>My borrowings</a>
          <a href="reservations.html" class="quick-action-btn" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none;"><span class="quick-action-icon"><i class="ti ti-bookmark"></i></span>Reservations</a>
          <a href="fines.html" class="quick-action-btn" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none;"><span class="quick-action-icon"><i class="ti ti-currency-rupee"></i></span>My fines</a>
          <a href="profile.html" class="quick-action-btn" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none;"><span class="quick-action-icon"><i class="ti ti-user"></i></span>Profile</a>
          <a href="settings.html" class="quick-action-btn" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none;"><span class="quick-action-icon"><i class="ti ti-settings"></i></span>Settings</a>
        </div>
      </div>
    </div>
  `;

  const { data: memberRow } = await supabase.from('members').select('id').eq('user_id', profile.id).single();
  const memberId = memberRow?.id || null;

  loadMemberStats(memberId);
  loadBorrowedList(memberId);
  loadReservationBox(memberId);
  loadNotifications();
  loadActivityList(profile.id);
  if (memberId) {
    loadFineSummary(memberId);
  } else {
    document.getElementById('fine-summary').innerHTML = `<div class="empty-state">No fines recorded.</div>`;
  }
}

function kpiSkeletonSimple(n) {
  return Array.from({ length: n }).map(() => `
    <div class="stat-card">
      <div class="stat-card__icon stat-card__icon--blue"><i class="ti ti-loader-2"></i></div>
      <div class="stat-card__value skeleton">—</div>
      <div class="stat-card__label">Loading…</div>
    </div>`).join('');
}

async function loadMemberStats(memberId) {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [borrowed, dueSoon, reservations, fines] = memberId
    ? await Promise.all([
      supabase.from('issues').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('status', 'issued'),
      supabase.from('issues').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('status', 'issued').gte('due_date', today).lte('due_date', in7),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('status', 'pending'),
      supabase.from('fines').select('amount, issues!inner(member_id)').eq('payment_status', 'pending').eq('issues.member_id', memberId),
    ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { data: [] }];

  const fineTotal = (fines.data || []).reduce((s, f) => s + Number(f.amount), 0);
  const localBorrowings = getLocalBorrowings();
  const localDueSoon = localBorrowings.filter((row) => {
    const days = Math.ceil((new Date(`${row.dueDate}T23:59:59`) - new Date()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  const cards = [
    { icon: 'ti-book-2', color: 'blue', label: 'Borrowed books', value: (borrowed.count ?? 0) + localBorrowings.length },
    { icon: 'ti-clock', color: 'emerald', label: 'Due in next 7 days', value: (dueSoon.count ?? 0) + localDueSoon },
    { icon: 'ti-bookmark', color: 'purple', label: 'Reservations', value: reservations.count ?? 0 },
    { icon: 'ti-currency-rupee', color: 'coral', label: 'Outstanding fines', value: `₹${fineTotal}` },
  ];

  document.getElementById('member-stats').innerHTML = cards.map((c) => `
    <div class="stat-card">
      <div class="stat-card__icon stat-card__icon--${c.color}"><i class="ti ${c.icon}"></i></div>
      <div class="stat-card__value">${c.value}</div>
      <div class="stat-card__label">${c.label}</div>
    </div>`).join('');
}

async function loadBorrowedList(memberId) {
  const { data } = memberId
    ? await supabase
      .from('issues')
      .select('issue_date, due_date, book_copies(books(title, authors(author_name)))')
      .eq('member_id', memberId)
      .eq('status', 'issued')
      .order('due_date')
    : { data: [] };

  const list = document.getElementById('borrowed-list');
  const localBorrowings = getLocalBorrowings();
  const rows = [
    ...(data || []).map((row) => ({
      title: row.book_copies?.books?.title || '—',
      author: row.book_copies?.books?.authors?.author_name || '',
      issueDate: row.issue_date,
      dueDate: row.due_date,
    })),
    ...localBorrowings,
  ];

  if (rows.length === 0) {
    list.innerHTML = `<li class="empty-state">No active borrowings.</li>`;
    return;
  }

  list.innerHTML = rows.map((row) => `
    <li>
      <div class="book-cover-sm"></div>
      <div class="book">
        <b>${escapeHtml(row.title)}</b>
        <small>${escapeHtml(row.author || 'Library collection')}</small>
      </div>
      <div class="meta"><label>Return date</label><span class="return-date">${escapeHtml(row.dueDate)}</span></div>
      <div class="days-left-pill" data-due-date="${escapeHtml(row.dueDate)}">Calculating…</div>
    </li>`).join('');

  updateBorrowingTimers();
  clearInterval(borrowingTimer);
  borrowingTimer = setInterval(updateBorrowingTimers, 1000);
}

function getLocalBorrowings() {
  try {
    return JSON.parse(localStorage.getItem('sl-local-borrowings') || '[]')
      .filter((row) => !row.memberId || row.memberId === profile.id)
      .map((row) => ({
        title: row.title,
        author: row.author || '',
        issueDate: row.issueDate,
        dueDate: row.dueDate,
      }));
  } catch {
    return [];
  }
}

function updateBorrowingTimers() {
  document.querySelectorAll('[data-due-date]').forEach((pill) => {
    const due = new Date(`${pill.dataset.dueDate}T23:59:59`);
    const remaining = due - new Date();
    const overdue = remaining < 0;
    const absolute = Math.abs(remaining);
    const days = Math.floor(absolute / 86400000);
    const hours = Math.floor((absolute % 86400000) / 3600000);
    const minutes = Math.floor((absolute % 3600000) / 60000);
    pill.classList.toggle('warn', overdue || days <= 3);
    pill.textContent = overdue
      ? `${days}d ${hours}h overdue`
      : `${days}d ${hours}h ${minutes}m left`;
  });
}

async function loadReservationBox(memberId) {
  if (!memberId) {
    document.getElementById('reservation-box').innerHTML = `<div class="empty-state">No active reservations.</div>`;
    return;
  }

  const { data } = await supabase
    .from('reservations')
    .select('id, book_id, reservation_date, status, books(title, authors(author_name))')
    .eq('member_id', memberId)
    .eq('status', 'pending')
    .order('reservation_date', { ascending: false })
    .limit(1);

  const box = document.getElementById('reservation-box');
  const res = data?.[0];

  if (!res) {
    box.innerHTML = `<div class="empty-state">No active reservations.</div>`;
    return;
  }

  const { count: queuePosition } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', res.book_id)
    .eq('status', 'pending')
    .lte('reservation_date', res.reservation_date);

  box.innerHTML = `
    <div class="reserved-box">
      <div class="reserved-top">
        <div class="reserved-cover"></div>
        <div class="reserved-title">
          <b>${escapeHtml(res.books?.title || '—')}</b>
          <small>${escapeHtml(res.books?.authors?.author_name || '')}</small>
        </div>
      </div>
      <div class="reserved-meta">
        <div>Reserved on<b>${res.reservation_date}</b></div>
        <div>Status<b class="status" style="color:var(--royal-blue); background:rgba(42,82,190,0.10); padding:4px 8px; border-radius:6px; width:max-content;">Pending</b></div>
      </div>
      <div class="queue-note">
        <b>You are #${queuePosition || 1} in the queue</b>
        We'll notify you when the book is available.
      </div>
    </div>`;
}

async function loadNotifications() {
  const { data } = await supabase
    .from('notifications')
    .select('title, message, type, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(4);

  const list = document.getElementById('notice-list');
  if (!data || data.length === 0) {
    list.innerHTML = `<li class="empty-state">No notifications yet.</li>`;
    return;
  }

  const iconFor = (type) => ({
    due_soon: ['ti-clock', 'rgba(245,179,1,0.14)', '#7A5200'],
    overdue: ['ti-alert-triangle', 'rgba(226,75,74,0.12)', '#791F1F'],
    reservation_available: ['ti-bookmark', 'rgba(16,185,129,0.12)', '#0B4B3A'],
    fine_generated: ['ti-currency-rupee', 'rgba(226,75,74,0.12)', '#791F1F'],
    membership_expiry: ['ti-id', 'rgba(124,58,237,0.12)', '#4C2C8F'],
    info: ['ti-bell', 'rgba(42,82,190,0.12)', '#1E3A8A'],
  }[type] || ['ti-bell', 'rgba(42,82,190,0.12)', '#1E3A8A']);

  list.innerHTML = data.map((n) => {
    const [icon, bg, color] = iconFor(n.type);
    return `
      <li>
        <div class="notice-icon" style="background:${bg}; color:${color};"><i class="ti ${icon}"></i></div>
        <div><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.message)}</small></div>
      </li>`;
  }).join('');
}

async function loadFineSummary(memberId) {
  const { data } = await supabase.from('fines').select('amount, issues!inner(member_id)').eq('payment_status', 'pending').eq('issues.member_id', memberId);
  const total = (data || []).reduce((s, f) => s + Number(f.amount), 0);
  const box = document.getElementById('fine-summary');

  if (total === 0) {
    box.innerHTML = `
      <h2 style="font-size:14px;">Fine summary</h2>
      <div class="fine-check"><i class="ti ti-check"></i></div>
      <h3>No outstanding fines!</h3>
      <p>You're all clear — keep it up.</p>`;
  } else {
    box.innerHTML = `
      <h2 style="font-size:14px;">Fine summary</h2>
      <div class="fine-check owed"><i class="ti ti-currency-rupee"></i></div>
      <h3>₹${total} outstanding</h3>
      <p>Visit the Fines page for details.</p>`;
  }
}

// ============================================================
// SHARED HELPERS
// ============================================================
function initials(name) {
  return (name || '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
