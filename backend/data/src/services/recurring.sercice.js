const db = require("../db");

/**
 * For a given user, finds every active recurring template whose next_run_on
 * date has arrived (or passed) and materializes it into a real transaction,
 * then advances next_run_on by one month. Runs catch-up for any months the
 * user was away, up to a sane cap so a stale account can't spin forever.
 *
 * Called at login and on dashboard load — no separate cron/worker needed for
 * a single-instance deployment like this one.
 */
function runDueRecurringTransactions(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const templates = db
    .prepare("SELECT * FROM recurring_transactions WHERE user_id = ? AND active = 1 AND next_run_on <= ?")
    .all(userId, today);

  if (templates.length === 0) return 0;

  const insertTx = db.prepare(`
    INSERT INTO transactions (user_id, description, amount, type, category, occurred_on, recurring_id)
    VALUES (@user_id, @description, @amount, @type, @category, @occurred_on, @recurring_id)
  `);
  const advance = db.prepare("UPDATE recurring_transactions SET next_run_on = ? WHERE id = ?");

  let created = 0;

  const run = db.transaction(() => {
    for (const tpl of templates) {
      let nextRun = new Date(tpl.next_run_on + "T00:00:00Z");
      let guard = 0;

      while (nextRun.toISOString().slice(0, 10) <= today && guard < 24) {
        insertTx.run({
          user_id: userId,
          description: tpl.description,
          amount: tpl.amount,
          type: tpl.type,
          category: tpl.category,
          occurred_on: nextRun.toISOString().slice(0, 10),
          recurring_id: tpl.id,
        });
        created += 1;
        guard += 1;

        nextRun = new Date(Date.UTC(nextRun.getUTCFullYear(), nextRun.getUTCMonth() + 1, tpl.day_of_month));
      }

      advance.run(nextRun.toISOString().slice(0, 10), tpl.id);
    }
  });

  run();
  return created;
}

module.exports = { runDueRecurringTransactions };
