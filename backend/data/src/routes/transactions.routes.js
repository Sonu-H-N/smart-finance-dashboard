const express = require("express");
const { body, query, param } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { runDueRecurringTransactions } = require("../services/recurring.service");

const router = express.Router();
router.use(requireAuth);

const SORTABLE_COLUMNS = new Set(["occurred_on", "amount", "created_at", "description", "category"]);

// ── LIST (search, filter, sort, pagination) ─────────────────────────────
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("pageSize").optional().isInt({ min: 1, max: 200 }).toInt(),
    query("type").optional().isIn(["income", "expense"]),
    query("category").optional().trim(),
    query("q").optional().trim().isLength({ max: 200 }),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601(),
    query("sort").optional().isIn([...SORTABLE_COLUMNS]),
    query("order").optional().isIn(["asc", "desc"]),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      // Catch up any recurring transactions that came due before returning data
      runDueRecurringTransactions(req.user.id);

      const page = req.query.page || 1;
      const pageSize = req.query.pageSize || 20;
      const sort = SORTABLE_COLUMNS.has(req.query.sort) ? req.query.sort : "occurred_on";
      const order = req.query.order === "asc" ? "ASC" : "DESC";

      const clauses = ["user_id = @userId"];
      const params = { userId: req.user.id };

      if (req.query.type) {
        clauses.push("type = @type");
        params.type = req.query.type;
      }
      if (req.query.category) {
        clauses.push("category = @category");
        params.category = req.query.category;
      }
      if (req.query.q) {
        clauses.push("description LIKE @q");
        params.q = `%${req.query.q}%`;
      }
      if (req.query.from) {
        clauses.push("occurred_on >= @from");
        params.from = req.query.from;
      }
      if (req.query.to) {
        clauses.push("occurred_on <= @to");
        params.to = req.query.to;
      }

      const where = clauses.join(" AND ");
      const total = db.prepare(`SELECT COUNT(*) AS n FROM transactions WHERE ${where}`).get(params).n;

      const rows = db
        .prepare(
          `SELECT id, description, amount, type, category, occurred_on, notes, recurring_id, created_at
           FROM transactions
           WHERE ${where}
           ORDER BY ${sort} ${order}, id ${order}
           LIMIT @limit OFFSET @offset`
        )
        .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

      res.json({
        data: rows,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── SUMMARY (totals + category breakdown + monthly trend) ───────────────
router.get("/summary", (req, res, next) => {
  try {
    const userId = req.user.id;

    const totals = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
         FROM transactions WHERE user_id = ?`
      )
      .get(userId);

    const byCategory = db
      .prepare(
        `SELECT category, SUM(amount) AS total
         FROM transactions
         WHERE user_id = ? AND type = 'expense'
         GROUP BY category
         ORDER BY total DESC`
      )
      .all(userId);

    // Last 6 months of income/expense, oldest first — for a trend chart
    const monthly = db
      .prepare(
        `SELECT
           strftime('%Y-%m', occurred_on) AS month,
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
         FROM transactions
         WHERE user_id = ? AND occurred_on >= date('now', '-5 months', 'start of month')
         GROUP BY month
         ORDER BY month ASC`
      )
      .all(userId);

    res.json({
      income: totals.income,
      expense: totals.expense,
      balance: totals.income - totals.expense,
      byCategory,
      monthly,
    });
  } catch (err) {
    next(err);
  }
});

// ── CREATE ────────────────────────────────────────────────────────────
router.post(
  "/",
  [
    body("description").trim().isLength({ min: 1, max: 200 }).withMessage("Description is required (max 200 chars)."),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number."),
    body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense."),
    body("category").trim().isLength({ min: 1, max: 40 }).withMessage("Category is required."),
    body("occurred_on").optional().isISO8601().withMessage("Date must be a valid date."),
    body("notes").optional({ nullable: true }).trim().isLength({ max: 500 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { description, amount, type, category, notes } = req.body;
      const occurred_on = req.body.occurred_on || new Date().toISOString().slice(0, 10);

      const info = db
        .prepare(
          `INSERT INTO transactions (user_id, description, amount, type, category, occurred_on, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(req.user.id, description, amount, type, category, occurred_on, notes || null);

      const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(info.lastInsertRowid);
      res.status(201).json({ data: tx });
    } catch (err) {
      next(err);
    }
  }
);

// ── UPDATE ────────────────────────────────────────────────────────────
router.put(
  "/:id",
  [
    param("id").isInt().toInt(),
    body("description").trim().isLength({ min: 1, max: 200 }),
    body("amount").isFloat({ gt: 0 }),
    body("type").isIn(["income", "expense"]),
    body("category").trim().isLength({ min: 1, max: 40 }),
    body("occurred_on").optional().isISO8601(),
    body("notes").optional({ nullable: true }).trim().isLength({ max: 500 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db
        .prepare("SELECT id FROM transactions WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.user.id);
      if (!existing) return res.status(404).json({ error: "Transaction not found." });

      const { description, amount, type, category, notes } = req.body;
      const occurred_on = req.body.occurred_on || undefined;

      db.prepare(
        `UPDATE transactions
         SET description = ?, amount = ?, type = ?, category = ?, notes = ?,
             occurred_on = COALESCE(?, occurred_on), updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      ).run(description, amount, type, category, notes || null, occurred_on, req.params.id, req.user.id);

      const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
      res.json({ data: tx });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE ────────────────────────────────────────────────────────────
router.delete("/:id", [param("id").isInt().toInt()], handleValidation, (req, res, next) => {
  try {
    const result = db
      .prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?")
      .run(req.params.id, req.user.id);

    if (result.changes === 0) return res.status(404).json({ error: "Transaction not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
