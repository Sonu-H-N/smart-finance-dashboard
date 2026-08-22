/* eslint-disable no-console */
// Creates (or resets) a demo account so reviewers/recruiters can log in
// immediately without registering. Safe to re-run — it wipes and
// recreates just the demo user's own data.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./index");

const DEMO_EMAIL = "demo@smartfinance.app";
const DEMO_PASSWORD = "demo1234";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function run() {
  let user = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_EMAIL);

  if (user) {
    db.prepare("DELETE FROM transactions WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM budgets WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM recurring_transactions WHERE user_id = ?").run(user.id);
    console.log(`Reset existing demo user (id=${user.id}).`);
  } else {
    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 12);
    const info = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run("Demo User", DEMO_EMAIL, passwordHash);
    user = { id: info.lastInsertRowid };
    console.log(`Created demo user (id=${user.id}).`);
  }

  const insertTx = db.prepare(`
    INSERT INTO transactions (user_id, description, amount, type, category, occurred_on, notes)
    VALUES (@user_id, @description, @amount, @type, @category, @occurred_on, @notes)
  `);

  const sample = [
    { description: "Monthly salary", amount: 65000, type: "income", category: "Salary", occurred_on: daysAgo(28), notes: null },
    { description: "Freelance project", amount: 12000, type: "income", category: "Salary", occurred_on: daysAgo(14), notes: "Logo design gig" },
    { description: "Grocery shopping", amount: 3200, type: "expense", category: "Food", occurred_on: daysAgo(25), notes: null },
    { description: "Dinner with friends", amount: 1450, type: "expense", category: "Food", occurred_on: daysAgo(20), notes: null },
    { description: "Metro pass", amount: 900, type: "expense", category: "Travel", occurred_on: daysAgo(27), notes: null },
    { description: "Cab rides", amount: 650, type: "expense", category: "Travel", occurred_on: daysAgo(10), notes: null },
    { description: "Electricity bill", amount: 2100, type: "expense", category: "Bills", occurred_on: daysAgo(22), notes: null },
    { description: "Internet bill", amount: 999, type: "expense", category: "Bills", occurred_on: daysAgo(18), notes: null },
    { description: "New headphones", amount: 3500, type: "expense", category: "Shopping", occurred_on: daysAgo(15), notes: null },
    { description: "Clothes shopping", amount: 2800, type: "expense", category: "Shopping", occurred_on: daysAgo(7), notes: null },
    { description: "Gym membership", amount: 1200, type: "expense", category: "Health", occurred_on: daysAgo(26), notes: null },
    { description: "Pharmacy", amount: 450, type: "expense", category: "Health", occurred_on: daysAgo(5), notes: null },
    { description: "Movie night", amount: 800, type: "expense", category: "Other", occurred_on: daysAgo(3), notes: null },
    { description: "Book purchase", amount: 599, type: "expense", category: "Other", occurred_on: daysAgo(1), notes: null },
  ];

  for (const t of sample) insertTx.run({ user_id: user.id, ...t });

  db.prepare("INSERT OR IGNORE INTO budgets (user_id, category, monthly_limit) VALUES (?, 'Food', 6000)").run(user.id);
  db.prepare("INSERT OR IGNORE INTO budgets (user_id, category, monthly_limit) VALUES (?, 'Shopping', 5000)").run(user.id);
  db.prepare("INSERT OR IGNORE INTO budgets (user_id, category, monthly_limit) VALUES (?, 'Bills', 3500)").run(user.id);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);

  db.prepare(`
    INSERT INTO recurring_transactions (user_id, description, amount, type, category, day_of_month, next_run_on)
    VALUES (?, 'Rent', 15000, 'expense', 'Bills', 1, ?)
  `).run(user.id, nextMonth.toISOString().slice(0, 10));

  console.log(`Seeded ${sample.length} transactions, 3 budgets, and 1 recurring rule.`);
  console.log(`\nDemo login:\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}`);
}

run();
