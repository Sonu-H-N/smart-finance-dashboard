import { api, ApiError, isLoggedIn, getUser, clearSession } from "./api.js";
import {
  toast, confirmDialog, formatCurrency, formatDate, categoryIcon,
  applyFieldErrors, initTheme,
} from "./ui.js";

// ── Auth guard ────────────────────────────────────────────────────────
if (!isLoggedIn()) {
  window.location.href = "login.html";
}

const user = getUser();
if (user) {
  document.getElementById("userName").textContent = user.name;
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userAvatar").textContent = user.name.slice(0, 1).toUpperCase();
}

initTheme("themeToggle");
document.addEventListener("themechange", () => {
  renderTrendChart(state.summary?.monthly || []);
  renderCategoryChart(state.summary?.byCategory || []);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

// ── Sidebar navigation ───────────────────────────────────────────────
const sections = ["overview", "transactions", "budgets", "recurring"];
const titles = { overview: "Overview", transactions: "Transactions", budgets: "Budgets", recurring: "Recurring" };

function showSection(name) {
  sections.forEach(s => {
    document.getElementById(`section-${s}`).classList.toggle("hidden", s !== name);
  });
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === name);
  });
  document.getElementById("pageTitle").textContent = titles[name];
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");

  if (name === "budgets") loadBudgets();
  if (name === "recurring") loadRecurring();
  if (name === "transactions") loadTransactions();
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

const menuToggle = document.getElementById("menuToggle");
menuToggle.addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  const open = sidebar.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

// ── Shared state ─────────────────────────────────────────────────────
const state = {
  summary: null,
  txPage: 1,
  txPageSize: 8,
  txSort: "occurred_on-desc",
};

let trendChart, categoryChart;

// ── Overview: summary, charts, insights, recent activity ────────────
async function loadOverview() {
  try {
    state.summary = await api.get("/transactions/summary");
    const s = state.summary;

    document.getElementById("statBalance").textContent = formatCurrency(s.balance);
    document.getElementById("statIncome").textContent = formatCurrency(s.income);
    document.getElementById("statExpense").textContent = formatCurrency(s.expense);

    // Charts depend on a third-party CDN library — never let that failure
    // (blocked network, ad-blocker, offline) take down the rest of the page.
    safely(() => renderTrendChart(s.monthly));
    safely(() => renderCategoryChart(s.byCategory));
    safely(() => renderInsights(s));

    const recent = await api.get("/transactions", { page: 1, pageSize: 5, sort: "occurred_on", order: "desc" });
    document.getElementById("statCount").textContent = recent.pagination.total;
    renderTxRows(document.getElementById("recentTxList"), recent.data, { compact: true });
  } catch (err) {
    handleError(err);
  }
}

function safely(fn) {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
}

function chartsAvailable() {
  if (typeof window.Chart === "undefined") {
    document.querySelectorAll(".chart-wrap").forEach(el => {
      if (!el.querySelector(".chart-fallback")) {
        el.insertAdjacentHTML("beforeend", `<div class="chart-fallback empty-state" style="padding:20px 0;"><p>Charts need the Chart.js CDN, which didn't load. Everything else still works.</p></div>`);
      }
    });
    return false;
  }
  return true;
}

function isLight() { return document.body.classList.contains("light"); }

function renderTrendChart(monthly) {
  if (!chartsAvailable()) return;
  const ctx = document.getElementById("trendChart").getContext("2d");
  if (trendChart) trendChart.destroy();

  const labels = monthly.map(m => {
    const [y, mo] = m.month.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short" });
  });

  const gridColor = isLight() ? "rgba(16,24,40,0.08)" : "rgba(255,255,255,0.08)";
  const textColor = isLight() ? "#667085" : "#8d97ae";

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Income", data: monthly.map(m => m.income), borderColor: "#34d399", backgroundColor: "rgba(52,211,153,0.12)", fill: true, tension: 0.35 },
        { label: "Expense", data: monthly.map(m => m.expense), borderColor: "#fb7185", backgroundColor: "rgba(251,113,133,0.12)", fill: true, tension: 0.35 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } },
      },
    },
  });
}

function renderCategoryChart(byCategory) {
  if (!chartsAvailable()) return;
  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (categoryChart) categoryChart.destroy();

  const textColor = isLight() ? "#101828" : "#eceff6";
  const palette = ["#4f7cff", "#fb7185", "#fbbf24", "#34d399", "#a78bfa", "#38bdf8", "#f472b6"];

  if (!byCategory.length) return;

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: byCategory.map(c => c.category),
      datasets: [{ data: byCategory.map(c => c.total), backgroundColor: palette }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: textColor, boxWidth: 12, padding: 10 } } },
    },
  });
}

// Rule-based Smart Insight engine — same deterministic heuristics as the
// original app, now driven by server-aggregated totals.
function renderInsights(summary) {
  const out = document.getElementById("insightList");
  const { income, expense, byCategory } = summary;

  if (income === 0 && expense === 0) {
    out.innerHTML = `<p>Add a few transactions to see your insights.</p>`;
    return;
  }

  const insights = [];

  if (byCategory.length > 0) {
    const top = byCategory[0];
    const pct = expense > 0 ? Math.round((top.total / expense) * 100) : 0;
    insights.push(`⚠️ <strong>${top.category}</strong> is your biggest expense — ${formatCurrency(top.total)} (${pct}% of spending).`);
  }

  if (income > 0) {
    const savingsRate = Math.round(((income - expense) / income) * 100);
    if (savingsRate >= 30) insights.push(`✅ Strong savings rate of ${savingsRate}% — keep it up.`);
    else if (savingsRate >= 0) insights.push(`📊 You're saving ${savingsRate}% of income. Aim for 20–30% if you can.`);
    else insights.push(`🚨 You're spending more than you earn (${Math.abs(savingsRate)}% over budget).`);
  }

  if (byCategory.length >= 4) {
    insights.push(`🧾 Spending is spread across ${byCategory.length} categories — review for anything trimmable.`);
  }

  if (income === 0 && expense > 0) {
    insights.push(`💡 No income logged yet — add your income entries for an accurate balance.`);
  }

  if (insights.length === 0) {
    insights.push("👍 Looking balanced so far — add more transactions for deeper insights.");
  }

  out.innerHTML = insights.map(line => `<p>${line}</p>`).join("");
}

// ── Transaction rows (shared by overview + list) ────────────────────
function renderTxRows(listEl, rows, { compact = false } = {}) {
  listEl.innerHTML = "";
  rows.forEach(t => {
    const li = document.createElement("li");
    li.className = `tx-row ${t.type}`;
    const sign = t.type === "income" ? "+" : "-";
    li.innerHTML = `
      <div class="tx-cat-ico">${categoryIcon(t.category)}</div>
      <div class="tx-main">
        <div class="tx-desc">${escapeText(t.description)}</div>
        <div class="tx-meta">${escapeText(t.category)} · ${formatDate(t.occurred_on)}${t.recurring_id ? " · 🔁 auto" : ""}</div>
      </div>
      <div class="tx-amount">${sign}${formatCurrency(t.amount)}</div>
      ${compact ? "" : `
        <div class="tx-actions">
          <button class="btn btn-icon btn-ghost" data-action="edit" title="Edit" aria-label="Edit transaction">✏️</button>
          <button class="btn btn-icon btn-ghost" data-action="delete" title="Delete" aria-label="Delete transaction">🗑️</button>
        </div>`}
    `;
    if (!compact) {
      li.querySelector('[data-action="edit"]').addEventListener("click", () => startEditTx(t));
      li.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTx(t));
    }
    listEl.appendChild(li);
  });
}

function escapeText(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ── Transactions section: form + list + filters + pagination ────────
const txForm = document.getElementById("txForm");
const txDesc = document.getElementById("txDesc");
const txAmount = document.getElementById("txAmount");
const txCategory = document.getElementById("txCategory");
const txDate = document.getElementById("txDate");
const txNotes = document.getElementById("txNotes");
const txId = document.getElementById("txId");
const txSubmitBtn = document.getElementById("txSubmitBtn");
const txCancelBtn = document.getElementById("txCancelBtn");
const txFormTitle = document.getElementById("txFormTitle");

let currentTxType = "income";
function setTxType(type) {
  currentTxType = type;
  document.getElementById("typeIncome").classList.toggle("active", type === "income");
  document.getElementById("typeIncome").classList.toggle("income-active", type === "income");
  document.getElementById("typeExpense").classList.toggle("active", type === "expense");
  document.getElementById("typeExpense").classList.toggle("expense-active", type === "expense");
}
document.getElementById("typeIncome").addEventListener("click", () => setTxType("income"));
document.getElementById("typeExpense").addEventListener("click", () => setTxType("expense"));

txDate.value = new Date().toISOString().slice(0, 10);

function resetTxForm() {
  txForm.reset();
  txId.value = "";
  txDate.value = new Date().toISOString().slice(0, 10);
  setTxType("income");
  txSubmitBtn.textContent = "Add transaction";
  txFormTitle.textContent = "Add transaction";
  txCancelBtn.classList.add("hidden");
  applyFieldErrors(txForm, []);
}

function startEditTx(t) {
  txId.value = t.id;
  txDesc.value = t.description;
  txAmount.value = t.amount;
  txCategory.value = t.category;
  txDate.value = t.occurred_on;
  txNotes.value = t.notes || "";
  setTxType(t.type);
  txSubmitBtn.textContent = "Save changes";
  txFormTitle.textContent = "Edit transaction";
  txCancelBtn.classList.remove("hidden");
  document.getElementById("txFormCard").scrollIntoView({ behavior: "smooth", block: "start" });
  txDesc.focus();
}
txCancelBtn.addEventListener("click", resetTxForm);

txForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  applyFieldErrors(txForm, []);

  const payload = {
    description: txDesc.value.trim(),
    amount: Number(txAmount.value),
    type: currentTxType,
    category: txCategory.value,
    occurred_on: txDate.value || undefined,
    notes: txNotes.value.trim() || undefined,
  };

  txSubmitBtn.disabled = true;
  try {
    if (txId.value) {
      await api.put(`/transactions/${txId.value}`, payload);
      toast("Transaction updated.", "success");
    } else {
      await api.post("/transactions", payload);
      toast("Transaction added.", "success");
    }
    resetTxForm();
    await Promise.all([loadTransactions(), loadOverview()]);
  } catch (err) {
    if (err instanceof ApiError && err.details) applyFieldErrors(txForm, err.details);
    handleError(err);
  } finally {
    txSubmitBtn.disabled = false;
  }
});

async function deleteTx(t) {
  const ok = await confirmDialog({
    title: "Delete this transaction?",
    message: `"${t.description}" (${formatCurrency(t.amount)}) will be permanently removed.`,
    confirmLabel: "Delete",
  });
  if (!ok) return;

  try {
    await api.del(`/transactions/${t.id}`);
    toast("Transaction deleted.", "success");
    await Promise.all([loadTransactions(), loadOverview()]);
  } catch (err) {
    handleError(err);
  }
}

// Filters / search / sort
const txSearch = document.getElementById("txSearch");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const sortBy = document.getElementById("sortBy");

let searchDebounce;
txSearch.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { state.txPage = 1; loadTransactions(); }, 300);
});
[filterType, filterCategory, sortBy].forEach(el => {
  el.addEventListener("change", () => { state.txPage = 1; loadTransactions(); });
});

async function loadTransactions() {
  const [sort, order] = sortBy.value.split("-");
  try {
    const res = await api.get("/transactions", {
      page: state.txPage,
      pageSize: state.txPageSize,
      q: txSearch.value.trim() || undefined,
      type: filterType.value || undefined,
      category: filterCategory.value || undefined,
      sort, order,
    });

    const listEl = document.getElementById("txList");
    const emptyEl = document.getElementById("txEmpty");

    if (res.data.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
    } else {
      emptyEl.classList.add("hidden");
      renderTxRows(listEl, res.data);
    }

    renderPagination(res.pagination);
  } catch (err) {
    handleError(err);
  }
}

function renderPagination(p) {
  const el = document.getElementById("pagination");
  el.innerHTML = "";
  if (p.totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.className = "btn btn-sm";
  prev.textContent = "← Prev";
  prev.disabled = p.page <= 1;
  prev.addEventListener("click", () => { state.txPage = p.page - 1; loadTransactions(); });

  const next = document.createElement("button");
  next.className = "btn btn-sm";
  next.textContent = "Next →";
  next.disabled = p.page >= p.totalPages;
  next.addEventListener("click", () => { state.txPage = p.page + 1; loadTransactions(); });

  const info = document.createElement("span");
  info.className = "page-info";
  info.textContent = `Page ${p.page} of ${p.totalPages} (${p.total} total)`;

  el.append(prev, info, next);
}

// ── Budgets ───────────────────────────────────────────────────────────
const budgetForm = document.getElementById("budgetForm");
budgetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  applyFieldErrors(budgetForm, []);
  const category = document.getElementById("budgetCategory").value;
  const monthly_limit = Number(document.getElementById("budgetLimit").value);

  try {
    await api.post("/budgets", { category, monthly_limit });
    toast(`Budget saved for ${category}.`, "success");
    budgetForm.reset();
    loadBudgets();
  } catch (err) {
    if (err instanceof ApiError && err.details) applyFieldErrors(budgetForm, err.details);
    handleError(err);
  }
});

async function loadBudgets() {
  try {
    const { data } = await api.get("/budgets");
    const listEl = document.getElementById("budgetList");
    const emptyEl = document.getElementById("budgetEmpty");

    if (data.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    listEl.innerHTML = data.map(b => {
      const pct = Math.min(100, Math.round((b.spent / b.monthly_limit) * 100));
      const barClass = b.spent > b.monthly_limit ? "over" : pct >= 80 ? "warn" : "";
      const statusPill = b.spent > b.monthly_limit
        ? `<span class="pill pill-expense">Over budget</span>`
        : pct >= 80 ? `<span class="pill pill-warning">Near limit</span>`
        : `<span class="pill pill-income">On track</span>`;
      return `
        <div class="budget-item" data-id="${b.id}">
          <div class="budget-head">
            <span class="cat">${categoryIcon(b.category)} ${escapeText(b.category)} ${statusPill}</span>
            <span class="amounts mono">${formatCurrency(b.spent)} / ${formatCurrency(b.monthly_limit)}</span>
          </div>
          <div class="budget-bar"><div class="budget-bar-fill ${barClass}" style="width:${pct}%"></div></div>
          <div style="text-align:right; margin-top:8px;">
            <button class="btn btn-sm btn-ghost" data-action="delete-budget" data-id="${b.id}" data-cat="${escapeText(b.category)}">Remove</button>
          </div>
        </div>`;
    }).join("");

    listEl.querySelectorAll('[data-action="delete-budget"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const ok = await confirmDialog({
          title: "Remove this budget?",
          message: `The ${btn.dataset.cat} budget will be removed. Past spending stays recorded.`,
          confirmLabel: "Remove",
        });
        if (!ok) return;
        try {
          await api.del(`/budgets/${btn.dataset.id}`);
          toast("Budget removed.", "success");
          loadBudgets();
        } catch (err) {
          handleError(err);
        }
      });
    });
  } catch (err) {
    handleError(err);
  }
}

// ── Recurring transactions ──────────────────────────────────────────
let currentRecType = "expense";
function setRecType(type) {
  currentRecType = type;
  document.getElementById("recTypeIncome").classList.toggle("active", type === "income");
  document.getElementById("recTypeIncome").classList.toggle("income-active", type === "income");
  document.getElementById("recTypeExpense").classList.toggle("active", type === "expense");
  document.getElementById("recTypeExpense").classList.toggle("expense-active", type === "expense");
}
document.getElementById("recTypeIncome").addEventListener("click", () => setRecType("income"));
document.getElementById("recTypeExpense").addEventListener("click", () => setRecType("expense"));

const recurringForm = document.getElementById("recurringForm");
recurringForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  applyFieldErrors(recurringForm, []);

  const payload = {
    description: document.getElementById("recDesc").value.trim(),
    amount: Number(document.getElementById("recAmount").value),
    type: currentRecType,
    category: document.getElementById("recCategory").value,
    day_of_month: Number(document.getElementById("recDay").value),
  };

  try {
    await api.post("/recurring", payload);
    toast("Recurring rule added.", "success");
    recurringForm.reset();
    document.getElementById("recDay").value = 1;
    setRecType("expense");
    loadRecurring();
  } catch (err) {
    if (err instanceof ApiError && err.details) applyFieldErrors(recurringForm, err.details);
    handleError(err);
  }
});

async function loadRecurring() {
  try {
    const { data } = await api.get("/recurring");
    const listEl = document.getElementById("recurringList");
    const emptyEl = document.getElementById("recurringEmpty");

    if (data.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    listEl.innerHTML = data.map(r => `
      <li class="tx-row ${r.type}" style="opacity:${r.active ? 1 : 0.5}">
        <div class="tx-cat-ico">${categoryIcon(r.category)}</div>
        <div class="tx-main">
          <div class="tx-desc">${escapeText(r.description)}</div>
          <div class="tx-meta">${escapeText(r.category)} · day ${r.day_of_month} of month · next: ${formatDate(r.next_run_on)}</div>
        </div>
        <div class="tx-amount">${r.type === "income" ? "+" : "-"}${formatCurrency(r.amount)}</div>
        <div class="tx-actions" style="opacity:1;">
          <button class="btn btn-sm" data-action="toggle" data-id="${r.id}">${r.active ? "Pause" : "Resume"}</button>
          <button class="btn btn-icon btn-ghost" data-action="delete" data-id="${r.id}" data-desc="${escapeText(r.description)}" title="Delete" aria-label="Delete rule">🗑️</button>
        </div>
      </li>
    `).join("");

    listEl.querySelectorAll('[data-action="toggle"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api.patch(`/recurring/${btn.dataset.id}/toggle`);
          loadRecurring();
        } catch (err) {
          handleError(err);
        }
      });
    });
    listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const ok = await confirmDialog({
          title: "Delete recurring rule?",
          message: `"${btn.dataset.desc}" will stop being logged automatically. Past transactions it created stay recorded.`,
          confirmLabel: "Delete",
        });
        if (!ok) return;
        try {
          await api.del(`/recurring/${btn.dataset.id}`);
          toast("Recurring rule deleted.", "success");
          loadRecurring();
        } catch (err) {
          handleError(err);
        }
      });
    });
  } catch (err) {
    handleError(err);
  }
}

// ── Export: PDF + CSV ────────────────────────────────────────────────
document.getElementById("downloadPdfBtn").addEventListener("click", async () => {
  try {
    const all = await fetchAllTransactions();
    const s = state.summary || (await api.get("/transactions/summary"));

    if (!window.jspdf) {
      toast("PDF library failed to load — check your internet connection.", "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 16;

    doc.setFontSize(16);
    doc.text("Smart Finance Report", 20, y); y += 6;
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString(), 20, y); y += 4;
    doc.text(`Account: ${user?.name || ""} (${user?.email || ""})`, 20, y); y += 10;

    doc.setFontSize(12);
    doc.text(`Balance: Rs. ${s.balance.toLocaleString("en-IN")}`, 20, y); y += 8;
    doc.text(`Income: Rs. ${s.income.toLocaleString("en-IN")}`, 20, y); y += 8;
    doc.text(`Expense: Rs. ${s.expense.toLocaleString("en-IN")}`, 20, y); y += 12;

    doc.setFontSize(13);
    doc.text("Transactions", 20, y); y += 8;
    doc.setFontSize(10);

    if (all.length === 0) {
      doc.text("No transactions recorded.", 20, y);
    } else {
      all.forEach(t => {
        if (y > 280) { doc.addPage(); y = 20; }
        const sign = t.type === "income" ? "+" : "-";
        doc.text(`${formatDate(t.occurred_on)}  ${t.description} (${t.category})  ${sign}Rs. ${Number(t.amount).toLocaleString("en-IN")}`, 20, y);
        y += 7;
      });
    }

    doc.save("Finance_Report.pdf");
  } catch (err) {
    handleError(err);
  }
});

document.getElementById("exportCsvBtn").addEventListener("click", async () => {
  try {
    const all = await fetchAllTransactions();
    const header = ["Date", "Description", "Type", "Category", "Amount", "Notes"];
    const rows = all.map(t => [
      t.occurred_on, t.description, t.type, t.category, t.amount, (t.notes || "").replace(/\n/g, " "),
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    handleError(err);
  }
});

async function fetchAllTransactions() {
  const first = await api.get("/transactions", { page: 1, pageSize: 200, sort: "occurred_on", order: "desc" });
  let all = [...first.data];
  for (let p = 2; p <= first.pagination.totalPages; p++) {
    const next = await api.get("/transactions", { page: p, pageSize: 200, sort: "occurred_on", order: "desc" });
    all = all.concat(next.data);
  }
  return all;
}

// ── Error handling ───────────────────────────────────────────────────
function handleError(err) {
  if (err instanceof ApiError) {
    toast(err.message, "error");
  } else {
    console.error(err);
    toast("Something went wrong. Please try again.", "error");
  }
}

// ── Init ──────────────────────────────────────────────────────────────
resetTxForm();
loadOverview();
