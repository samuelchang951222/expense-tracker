/* ============================
   Expense Tracker — App Logic
   ============================ */

const STATE = {
  budget: null,        // { type: 'daily'|'weekly'|'monthly', amount: number, setDate: ISO string }
  expenses: [],        // [{ id, amount, category, description, date, createdAt }]
  activePeriod: 'daily',
  notifications: true,
  onboarded: false
};

// ---- Helpers ----
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function weekStartISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---- Category colours/icons ----
const CATEGORY_MAP = {
  'Food & Drink':   { icon: '🍕', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  'Transport':      { icon: '🚗', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  'Shopping':       { icon: '🛍️', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  'Entertainment':  { icon: '🎬', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  'Bills':          { icon: '📄', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  'Healthcare':     { icon: '💊', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  'Education':      { icon: '📚', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  'Housing':        { icon: '🏠', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  'Other':          { icon: '📌', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' }
};

// ---- Data persistence ----
async function loadData() {
  const data = await window.electronAPI.loadData();
  if (data) {
    STATE.budget = data.budget || null;
    STATE.expenses = data.expenses || [];
    STATE.onboarded = Boolean(data.onboarded);
    // migrate old data
    if (STATE.budget && !STATE.budget.setDate) STATE.budget.setDate = todayISO();
  }
}

async function saveData() {
  const result = await window.electronAPI.saveData({
    budget: STATE.budget,
    expenses: STATE.expenses,
    onboarded: STATE.onboarded
  });
  if (result && result.overspend && result.overspend.overspent) {
    showOverspendAlert(result.overspend);
  } else {
    hideOverspendAlert();
  }
  return result;
}

// ---- Filter expenses by period ----
function getFilteredExpenses() {
  if (!STATE.expenses.length) return [];
  const period = STATE.activePeriod;
  if (period === 'daily') {
    const key = todayISO();
    return STATE.expenses.filter(e => e.date === key).sort((a, b) => b.createdAt - a.createdAt);
  }
  if (period === 'weekly') {
    const start = weekStartISO();
    return STATE.expenses.filter(e => e.date >= start).sort((a, b) => b.createdAt - a.createdAt);
  }
  if (period === 'monthly') {
    const key = monthKey();
    return STATE.expenses.filter(e => e.date.startsWith(key)).sort((a, b) => b.createdAt - a.createdAt);
  }
  return [];
}

function getPeriodTotal() {
  const filtered = getFilteredExpenses();
  return filtered.reduce((s, e) => s + e.amount, 0);
}

function getBudgetAmount() {
  if (!STATE.budget) return 0;
  return STATE.budget.amount;
}

function getPeriodLabel() {
  return STATE.activePeriod;
}

// ---- Render Budget ----
function renderBudget() {
  const total = getPeriodTotal();
  const budget = getBudgetAmount();
  const remaining = budget - total;

  // Spent amount
  document.getElementById('spentAmount').textContent = `$${total.toFixed(total % 1 === 0 ? 0 : 2)}`;
  document.getElementById('budgetAmount').textContent = budget > 0 ? `$${budget.toFixed(budget % 1 === 0 ? 0 : 2)}` : 'Not set';
  document.getElementById('budgetPeriod').textContent = STATE.activePeriod;

  // Remaining
  const remEl = document.getElementById('remainingAmount');
  const remVal = remEl.querySelector('.remaining-value');
  const remLabel = remEl.querySelector('.remaining-label');
  if (budget === 0) {
    remVal.textContent = 'Set budget';
    remVal.style.color = 'var(--text-muted)';
    remLabel.textContent = 'in settings';
  } else if (remaining >= 0) {
    remVal.textContent = `$${remaining.toFixed(remaining % 1 === 0 ? 0 : 2)}`;
    remVal.style.color = 'var(--green)';
    remLabel.textContent = 'remaining';
  } else {
    remVal.textContent = `-$${Math.abs(remaining).toFixed(Math.abs(remaining) % 1 === 0 ? 0 : 2)}`;
    remVal.style.color = 'var(--red)';
    remLabel.textContent = 'over budget!';
  }

  // Progress ring
  const ring = document.getElementById('ringProgress');
  const circumference = 2 * Math.PI * 52; // 326.73
  ring.style.strokeDasharray = circumference;

  if (budget === 0 || total === 0) {
    ring.style.strokeDashoffset = circumference;
    ring.classList.remove('warning', 'danger');
  } else {
    const ratio = Math.min(total / budget, 1);
    const offset = circumference * (1 - ratio);
    ring.style.strokeDashoffset = offset;
    ring.classList.remove('warning', 'danger');
    if (ratio >= 0.9) ring.classList.add('danger');
    else if (ratio >= 0.7) ring.classList.add('warning');
  }
}

// ---- Overspend Alert ----
function showOverspendAlert(data) {
  const el = document.getElementById('overspendAlert');
  el.classList.remove('hidden');
  document.getElementById('overspendText').textContent =
    `You're $${data.overBy.toFixed(2)} over your ${data.periodLabel} budget of $${data.budget.toFixed(2)}`;
}

function hideOverspendAlert() {
  document.getElementById('overspendAlert').classList.add('hidden');
}

// ---- Render Transactions ----
function renderTransactions() {
  const list = document.getElementById('transactionsList');
  const items = getFilteredExpenses();

  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💸</div>
        <div class="empty-state-text">No expenses yet</div>
        <div class="empty-state-sub">Add your first expense above</div>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map(e => {
    const cat = CATEGORY_MAP[e.category] || CATEGORY_MAP['Other'];
    const time = new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const desc = e.description || e.category;
    return `
      <div class="transaction-item" data-id="${e.id}">
        <div class="tx-icon" style="background:${cat.bg}; color:${cat.color}">${cat.icon}</div>
        <div class="tx-info">
          <div class="tx-desc">${escapeHtml(desc)}</div>
          <div class="tx-meta">
            <span>${time}</span>
            <span class="tx-category" style="color:${cat.color}">${e.category}</span>
          </div>
        </div>
        <div class="tx-amount">-$${e.amount.toFixed(e.amount % 1 === 0 ? 0 : 2)}</div>
        <button class="tx-delete" data-id="${e.id}" title="Delete">🗑️</button>
      </div>
    `;
  }).join('');

  // Delete handlers
  list.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const id = btn.dataset.id;
      STATE.expenses = STATE.expenses.filter(e => e.id !== id);
      await saveData();
      renderAll();
    });
  });
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ---- Add Expense ----
async function addExpense() {
  const amountInput = document.getElementById('expenseAmount');
  const category = document.getElementById('expenseCategory').value;
  const description = document.getElementById('expenseDescription').value.trim();
  const amount = parseFloat(amountInput.value);

  if (!amount || amount <= 0) {
    amountInput.style.borderColor = 'var(--red)';
    amountInput.focus();
    setTimeout(() => amountInput.style.borderColor = '', 1000);
    return;
  }

  const expense = {
    id: uid(),
    amount,
    category,
    description,
    date: todayISO(),
    createdAt: Date.now()
  };

  STATE.expenses.push(expense);
  amountInput.value = '';
  document.getElementById('expenseDescription').value = '';
  amountInput.focus();

  await saveData();
  renderAll();
}

// ---- Settings Modal ----
function openSettings() {
  const modal = document.getElementById('settingsModal');
  modal.classList.remove('hidden');

  const type = STATE.budget ? STATE.budget.type : 'daily';
  const amount = STATE.budget ? STATE.budget.amount : '';
  const notif = STATE.notifications !== false;

  document.querySelector(`input[name="budgetType"][value="${type}"]`).checked = true;
  document.getElementById('modalBudgetAmount').value = amount || '';
  document.getElementById('notifToggle').checked = notif;
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

async function saveSettings() {
  const type = document.querySelector('input[name="budgetType"]:checked').value;
  const amount = parseFloat(document.getElementById('modalBudgetAmount').value);

  if (!amount || amount <= 0) {
    document.getElementById('modalBudgetAmount').focus();
    return;
  }

  STATE.budget = {
    type,
    amount,
    setDate: todayISO()
  };
  STATE.notifications = document.getElementById('notifToggle').checked;
  STATE.activePeriod = type;

  // Sync tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.period === type);
  });

  closeSettings();
  await saveData();
  renderAll();
}

// ---- Render All ----
function renderAll() {
  renderBudget();
  renderTransactions();
}

function showWelcome() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  document.body.classList.remove('app-loading', 'show-app');
  document.body.classList.add('show-welcome');
  welcomeScreen.setAttribute('aria-hidden', 'false');
}

function showTracker() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  document.body.classList.remove('app-loading', 'show-welcome');
  document.body.classList.add('show-app');
  welcomeScreen.setAttribute('aria-hidden', 'true');
}

async function completeOnboarding() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  const getStartedBtn = document.getElementById('getStartedBtn');

  if (welcomeScreen.classList.contains('is-leaving')) return;

  getStartedBtn.disabled = true;
  STATE.onboarded = true;
  await saveData();

  welcomeScreen.classList.add('is-leaving');

  let fallbackTimer;
  const finishTransition = (event) => {
    if (event && (event.target !== welcomeScreen || event.propertyName !== 'opacity')) return;
    window.clearTimeout(fallbackTimer);
    welcomeScreen.removeEventListener('transitionend', finishTransition);
    welcomeScreen.classList.remove('is-leaving');
    showTracker();
  };

  welcomeScreen.addEventListener('transitionend', finishTransition);
  fallbackTimer = window.setTimeout(finishTransition, 500);
}

// ---- Init ----
async function init() {
  await loadData();

  // Set initial period from budget or default
  if (STATE.budget) {
    STATE.activePeriod = STATE.budget.type;
  }

  // Sync tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.period === STATE.activePeriod);
  });

  renderAll();

  if (STATE.onboarded) showTracker();
  else showWelcome();

  // ---- Event bindings ----

  // Period tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      STATE.activePeriod = tab.dataset.period;
      const showAllBtn = document.getElementById('showAllBtn');
      showAllBtn.dataset.mode = 'period';
      showAllBtn.textContent = 'All Time';
      renderAll();
      // Also re-check overspend
      window.electronAPI.checkOverspend().then(r => {
        if (r && r.overspent) showOverspendAlert(r);
        else hideOverspendAlert();
      });
    });
  });

  // Add expense
  document.getElementById('addExpenseBtn').addEventListener('click', addExpense);
  document.getElementById('expenseAmount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addExpense();
  });
  document.getElementById('expenseDescription').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addExpense();
  });

  // Settings
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('modalClose').addEventListener('click', closeSettings);
  document.getElementById('modalCancel').addEventListener('click', closeSettings);
  document.getElementById('modalSave').addEventListener('click', saveSettings);

  // Close modal on overlay click
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });

  // Save on Enter in modal
  document.getElementById('modalBudgetAmount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
  });

  // Show All / toggle filter
  const showAllBtn = document.getElementById('showAllBtn');
  showAllBtn.dataset.mode = 'period';

  showAllBtn.addEventListener('click', async () => {
    const btn = showAllBtn;
    const periodLabel = STATE.activePeriod.charAt(0).toUpperCase() + STATE.activePeriod.slice(1);
    const isAllView = btn.dataset.mode === 'all';

    if (!isAllView) {
      btn.dataset.mode = 'all';
      btn.textContent = `Back to ${periodLabel}`;
      const all = [...STATE.expenses].sort((a, b) => b.createdAt - a.createdAt);
      renderTransactionList(all);
    } else {
      btn.dataset.mode = 'period';
      btn.textContent = 'All Time';
      renderAll();
    }
  });

  document.getElementById('getStartedBtn').addEventListener('click', completeOnboarding);

  // Window controls
  document.getElementById('closeBtn').addEventListener('click', () => window.electronAPI.close());
  document.getElementById('minimizeBtn').addEventListener('click', () => window.electronAPI.minimize());
}

function renderTransactionList(items) {
  const list = document.getElementById('transactionsList');
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💸</div><div class="empty-state-text">No expenses</div></div>';
    return;
  }
  list.innerHTML = items.map(e => {
    const cat = CATEGORY_MAP[e.category] || CATEGORY_MAP['Other'];
    const date = new Date(e.createdAt);
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const desc = e.description || e.category;
    return `
      <div class="transaction-item" data-id="${e.id}">
        <div class="tx-icon" style="background:${cat.bg}; color:${cat.color}">${cat.icon}</div>
        <div class="tx-info">
          <div class="tx-desc">${escapeHtml(desc)}</div>
          <div class="tx-meta">
            <span>${dateStr} ${time}</span>
            <span class="tx-category" style="color:${cat.color}">${e.category}</span>
          </div>
        </div>
        <div class="tx-amount">-$${e.amount.toFixed(e.amount % 1 === 0 ? 0 : 2)}</div>
        <button class="tx-delete" data-id="${e.id}" title="Delete">🗑️</button>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const id = btn.dataset.id;
      STATE.expenses = STATE.expenses.filter(e => e.id !== id);
      await saveData();
      btn.closest('.transaction-item').remove();
      renderAll();
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
