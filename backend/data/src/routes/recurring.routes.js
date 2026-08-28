const express = require("express");
const { body, param } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { runDueRecurringTransactions } = require("../services/recurring.service");

const router = express.Router();
router.use(requireAuth);

function nextRunOnFor(dayOfMonth) {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth));
  if (candidate < now) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  return candidate.toISOString().slice(0, 10);
}

router.get("/", (req, res, next) => {
  try {
    runDueRecurringTransactions(req.user.id);
    const data = db
      .prepare("SELECT * FROM recurring_transactions WHERE user_id = ? ORDER BY next_run_on ASC")
      .all(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  [
    body("description").trim().isLength({ min: 1, max: 200 }),
    body("amount").isFloat({ gt: 0 }),
    body("type").isIn(["income", "expense"]),
    body("category").trim().isLength({ min: 1, max: 40 }),
    body("day_of_month").isInt({ min: 1, max: 28 }).withMessage("Day of month must be between 1 and 28."),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { description, amount, type, category, day_of_month } = req.body;
      const next_run_on = nextRunOnFor(day_of_month);

      const info = db
        .prepare(
          `INSERT INTO recurring_transactions (user_id, description, amount, type, category, day_of_month, next_run_on)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(req.user.id, description, amount, type, category, day_of_month, next_run_on);

      const row = db.prepare("SELECT * FROM recurring_transactions WHERE id = ?").get(info.lastInsertRowid);
      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  }
);

router.patch("/:id/toggle", [param("id").isInt().toInt()], handleValidation, (req, res, next) => {
  try {
    const row = db
      .prepare("SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: "Recurring rule not found." });

    db.prepare("UPDATE recurring_transactions SET active = ? WHERE id = ?").run(row.active ? 0 : 1, row.id);
    res.json({ data: { ...row, active: row.active ? 0 : 1 } });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", [param("id").isInt().toInt()], handleValidation, (req, res, next) => {
  try {
    const result = db
      .prepare("DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?")
      .run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: "Recurring rule not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
