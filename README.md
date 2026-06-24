# 💰 Smart Finance Dashboard

> A clean, single-user finance tracker with income/expense logging, a live pie chart, PDF reports, and a rule-based spending insight engine — built with vanilla HTML, CSS, and JavaScript.

![PWA Ready](https://img.shields.io/badge/PWA-Installable-3b82f6?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 📸 Overview

Smart Finance Dashboard is a portfolio / final-year project that covers the core workflow of a personal finance tracker: log income and expenses, see your balance update live, visualize the split with a chart, export a PDF report, and get plain-language spending insights — all behind a simple login screen, with zero backend required.

---

## ✨ Features

### 🔐 Login
- Simple username/password gate (demo credentials shown on the login screen)
- Session persisted in `localStorage`; the dashboard redirects back to login if you're signed out
- **Note:** this is a single hardcoded demo credential, not real authentication — see [Limitations](#-known-limitations) below

### 💸 Transactions
- Add a transaction with a description, **Income or Expense type**, category, and amount
- Categories: Food, Travel, Bills, Shopping, Salary, Other
- Transaction list shows newest first, color-coded green (income) / red (expense)
- Delete any transaction
- All amounts formatted in Indian Rupee (₹) with proper thousands separators

### 📊 Balance & Summary
- Live-updating Balance, Income, and Expense cards
- Interactive pie chart (Chart.js) comparing income vs. expense, restyled automatically for light/dark mode

### 🤖 Smart Insight
A small rule-based engine that reads your transaction history and surfaces plain-language observations:
- Your single biggest expense category, with its share of total spending
- Your savings rate, with a status (strong / on track / overspending)
- A flag if spending is scattered across many categories
- A nudge to log income if only expenses are recorded

This is deterministic, explainable logic over your own data — not a hosted AI model — which means it works fully offline and never sends your financial data anywhere.

### 📄 PDF Report
- One-click **Download Report** — generates a PDF (via jsPDF) with your balance, income, expense totals, and the full transaction list

### 🎨 Interface
- Dark/light theme toggle, persisted across sessions
- Responsive layout for mobile screens
- Installable as a Progressive Web App with offline support

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure (login + dashboard) |
| CSS3 | CSS-variable-driven theming, responsive layout |
| Vanilla JavaScript (ES6+) | All app logic, no frameworks |
| [Chart.js](https://www.chartjs.org/) | Income vs. expense pie chart |
| [jsPDF](https://parall.ax/products/jspdf) | Client-side PDF report generation |
| localStorage | Transactions, session, and theme persistence |
| Service Worker | PWA offline caching |

---

## 📂 Project Structure

```
smart-finance-dashboard/
├── login.html           # Entry point — login screen
├── login.js               # Login logic, session check, SW registration
├── index.html               # Main dashboard (protected — requires login)
├── script.js                  # All dashboard logic: transactions, chart, insights, PDF
├── style.css                    # Shared design system for both pages
├── manifest.json                  # PWA manifest (installable, standalone display)
├── service-worker.js                # Offline caching
└── README.md                          # This file
```

> **No build tools. No npm. No backend.** Open `login.html` in a browser and it works immediately.

---

## ⚙️ How to Run

### Option 1 — Open directly
```
Double-click login.html   →   Sign in with admin / 1234
```

### Option 2 — Live Server (recommended, required for the Service Worker)
```bash
# VS Code extension
Install "Live Server" → Right-click login.html → "Open with Live Server"

# Or with Python
python -m http.server 8080
# Then visit http://localhost:8080/login.html
```

---

## 🔑 Demo Credentials

```
Username: admin
Password: 1234
```

---

## ⚠️ Known Limitations

This is a frontend-only demo, so a few things are intentionally simplified rather than production-grade:

- **Login is a single hardcoded credential pair**, not real authentication. There's no password hashing, no user accounts, and no server-side verification. It exists to demonstrate a protected-page flow, not to secure real data.
- **All data lives in localStorage** on one browser/device. Clearing browser data or switching devices loses your transaction history.
- **"Smart Insight" is rule-based, not a hosted AI model.** It runs entirely client-side over your own data using a handful of financial heuristics (top spending category, savings rate, category spread) — which is also why it works offline.

For a production version, swap localStorage for a real backend (Firebase, Supabase, or Node.js/Express + a database) and replace the login check with proper authentication.

---

## 🗂️ Data Storage

| Key | Contents |
|---|---|
| `transactions` | Array of `{ id, text, amount, category }` — positive amount = income, negative = expense |
| `loggedIn` | `"true"` while signed in |
| `theme` | `dark` or `light` |

---

## 🔮 Possible Extensions

- 📅 Monthly/yearly filtering and trend charts
- 🏦 Multiple accounts or wallets
- ☁️ Backend sync with real authentication
- 🔁 Recurring transactions
- 📊 Budget limits per category with alerts

---

## 👨‍💻 Author

**Sonu H N**
Passionate about web development and building tools that make managing money simpler.

---

## 📜 License

This project is open-source under the MIT License.
