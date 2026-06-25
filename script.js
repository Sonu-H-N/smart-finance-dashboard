/* ==========================================================
   Smart Finance Dashboard — App Logic
   ========================================================== */

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let chart;
let currentType = "income"; // tracks the active Income/Expense toggle state

// Protect page — redirect to login if not authenticated
if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "login.html";
}

// ─── TRANSACTION TYPE TOGGLE ─────────────────────────────────
function setTransactionType(type) {
  currentType = type;
  document.getElementById("typeIncome").classList.toggle("active", type === "income");
  document.getElementById("typeExpense").classList.toggle("active", type === "expense");
}

// ─── ADD TRANSACTION ──────────────────────────────────────────
function addTransaction() {
  const textInput = document.getElementById("text");
  const amountInput = document.getElementById("amount");
  const category = document.getElementById("category").value;

  const text = textInput.value.trim();
  const rawAmount = amountInput.value;

  if (text === "" || rawAmount === "" || isNaN(Number(rawAmount))) {
    alert("Enter a description and a valid amount");
    return;
  }

  const numericAmount = Math.abs(Number(rawAmount));
  if (numericAmount === 0) {
    alert("Amount must be greater than zero");
    return;
  }

  const amount = currentType === "expense" ? -numericAmount : numericAmount;

  const transaction = {
    id: Date.now(),
    text,
    amount,
    category
  };

  transactions.push(transaction);
  updateLocalStorage();
  showTransactions();

  textInput.value = "";
  amountInput.value = "";
}

// ─── DELETE ───────────────────────────────────────────────────
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  updateLocalStorage();
  showTransactions();
}

// ─── LOCAL STORAGE ────────────────────────────────────────────
function updateLocalStorage() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// ─── RENDER ───────────────────────────────────────────────────
function showTransactions() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let income = 0;
  let expense = 0;

  // Most recent first
  const sorted = [...transactions].sort((a, b) => b.id - a.id);

  if (sorted.length === 0) {
    list.innerHTML = `<li class="empty-row">No transactions yet — add your first one above.</li>`;
  }

  sorted.forEach(t => {
    const li = document.createElement("li");
    li.classList.add(t.amount > 0 ? "plus" : "minus");

    const sign = t.amount > 0 ? "+" : "-";
    li.innerHTML = `
      <span class="tx-text">${escapeHtml(t.text)} <small>(${escapeHtml(t.category)})</small></span>
      <span class="tx-amount">${sign}₹${Math.abs(t.amount).toLocaleString("en-IN")}</span>
      <button onclick="deleteTransaction(${t.id})" title="Delete">❌</button>
    `;

    list.appendChild(li);
  });

  transactions.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else expense += t.amount;
  });

  const balance = income + expense;

  document.getElementById("income").innerText = "₹" + income.toLocaleString("en-IN");
  document.getElementById("expense").innerText = "₹" + Math.abs(expense).toLocaleString("en-IN");
  document.getElementById("balance").innerText = "₹" + balance.toLocaleString("en-IN");

  updateChart(income, Math.abs(expense));
  analyzeSpending();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─── CHART ────────────────────────────────────────────────────
function updateChart(income, expense) {
  const ctx = document.getElementById("financeChart").getContext("2d");

  if (chart) chart.destroy();

  if (income === 0 && expense === 0) {
    return; // nothing meaningful to plot yet
  }

  const isLight = document.body.classList.contains("light");

  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        data: [income, expense],
        backgroundColor: ["#22c55e", "#ef4444"]
      }]
    },
    options: {
      plugins: {
        legend: {
          labels: { color: isLight ? "#0f172a" : "#fff" }
        }
      }
    }
  });
}

// ─── SMART INSIGHT ENGINE ─────────────────────────────────────
// A small set of rule-based checks over the transaction history.
// Not a model — deterministic, explainable financial heuristics.
function analyzeSpending() {
  const out = document.getElementById("analysis");
  if (!out) return;

  if (transactions.length === 0) {
    out.innerHTML = "Add a few transactions to see your insights.";
    return;
  }

  const insights = [];

  let income = 0;
  let expense = 0;
  const categoryTotals = {};

  transactions.forEach(t => {
    if (t.amount > 0) {
      income += t.amount;
    } else {
      expense += Math.abs(t.amount);
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    }
  });

  // Rule 1 — top spending category
  let topCategory = "";
  let topAmount = 0;
  for (const cat in categoryTotals) {
    if (categoryTotals[cat] > topAmount) {
      topAmount = categoryTotals[cat];
      topCategory = cat;
    }
  }
  if (topCategory) {
    const pct = expense > 0 ? Math.round((topAmount / expense) * 100) : 0;
    insights.push(`⚠️ ${topCategory} is your biggest expense — ₹${topAmount.toLocaleString("en-IN")} (${pct}% of spending).`);
  }

  // Rule 2 — savings rate
  if (income > 0) {
    const savingsRate = Math.round(((income - expense) / income) * 100);
    if (savingsRate >= 30) {
      insights.push(`✅ Strong savings rate of ${savingsRate}% — keep it up.`);
    } else if (savingsRate >= 0) {
      insights.push(`📊 You're saving ${savingsRate}% of income. Aim for 20–30% if you can.`);
    } else {
      insights.push(`🚨 You're spending more than you earn (${Math.abs(savingsRate)}% over budget).`);
    }
  }

  // Rule 3 — expense diversity (too many categories close together can signal scattered spending)
  const activeCategories = Object.keys(categoryTotals).length;
  if (activeCategories >= 4 && expense > 0) {
    insights.push(`🧾 Spending is spread across ${activeCategories} categories — review for anything trimmable.`);
  }

  // Rule 4 — no income logged at all
  if (income === 0 && expense > 0) {
    insights.push(`💡 No income logged yet — add your income entries for an accurate balance.`);
  }

  // Rule 5 — healthy, no-data-issue fallback
  if (insights.length === 0) {
    insights.push("👍 Looking balanced so far — add more transactions for deeper insights.");
  }

  out.innerHTML = insights.map(line => `<p>${line}</p>`).join("");
}

function getAIAdvice() {
  analyzeSpending();
}

// ─── THEME ────────────────────────────────────────────────────
function initTheme() {
  const toggleBtn = document.getElementById("themeToggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");

    if (document.body.classList.contains("light")) {
      toggleBtn.innerText = "☀️";
      localStorage.setItem("theme", "light");
    } else {
      toggleBtn.innerText = "🌙";
      localStorage.setItem("theme", "dark");
    }

    // Re-render the chart so legend text color matches the new theme
    showTransactions();
  });

  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
    toggleBtn.innerText = "☀️";
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────
function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

// ─── PDF EXPORT ───────────────────────────────────────────────
async function downloadPDF() {
  if (!window.jspdf) {
    alert("PDF library failed to load — check your internet connection.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 16;

  doc.setFontSize(16);
  doc.text("Smart Finance Report", 20, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString(), 20, y);
  y += 10;

  let income = 0;
  let expense = 0;
  transactions.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else expense += t.amount;
  });
  const balance = income + expense;

  doc.setFontSize(12);
  doc.text(`Balance: Rs. ${balance.toLocaleString("en-IN")}`, 20, y); y += 8;
  doc.text(`Income: Rs. ${income.toLocaleString("en-IN")}`, 20, y); y += 8;
  doc.text(`Expense: Rs. ${Math.abs(expense).toLocaleString("en-IN")}`, 20, y); y += 12;

  doc.setFontSize(13);
  doc.text("Transactions", 20, y); y += 8;
  doc.setFontSize(10);

  if (transactions.length === 0) {
    doc.text("No transactions recorded.", 20, y);
  } else {
    const sorted = [...transactions].sort((a, b) => b.id - a.id);
    sorted.forEach(t => {
      if (y > 280) { doc.addPage(); y = 20; }
      const sign = t.amount > 0 ? "+" : "-";
      doc.text(`${t.text} (${t.category})  ${sign}Rs. ${Math.abs(t.amount).toLocaleString("en-IN")}`, 20, y);
      y += 7;
    });
  }

  doc.save("Finance_Report.pdf");
}

// ─── INIT ─────────────────────────────────────────────────────
window.addEventListener("load", () => {
  initTheme();
  showTransactions();

  // Register service worker for offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // Offline support unavailable (e.g. file:// protocol) — non-fatal
    });
  }
});
