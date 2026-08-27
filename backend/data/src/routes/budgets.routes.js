const express = require("express");
const { body, param } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

// List budgets with the current month's actual spend against each limit
router.get("/", (req, res, next) => {
  try {
    const budgets = db
      .prepare(
        `SELECT b.id, b.category, b.monthly_limit,
                COALESCE((
                  SELECT SUM(t.amount) FROM transactions t
                  WHERE t.user_id = b.user_id AND t.category = b.category AND t.type = 'expense'
                    AND strftime('%Y-%m', t.occurred_on) = strftime('%Y-%m', 'now')
                ), 0) AS spent
         FROM budgets b
         WHERE b.user_id = ?
         ORDER BY b.category ASC`
      )
      .all(req.user.id);

    res.json({ data: budgets });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  [
    body("category").trim().isLength({ min: 1, max: 40 }).withMessage("Category is required."),
    body("monthly_limit").isFloat({ gt: 0 }).withMessage("Monthly limit must be a positive number."),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { category, monthly_limit } = req.body;

      const info = db
        .prepare(
          `INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)
           ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit = excluded.monthly_limit, updated_at = datetime('now')`
        )
        .run(req.user.id, category, monthly_limit);

      const id = info.lastInsertRowid || db.prepare("SELECT id FROM budgets WHERE user_id = ? AND category = ?").get(req.user.id, category).id;
      const budget = db.prepare("SELECT * FROM budgets WHERE id = ?").get(id);
      res.status(201).json({ data: budget });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", [param("id").isInt().toInt()], handleValidation, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: "Budget not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
