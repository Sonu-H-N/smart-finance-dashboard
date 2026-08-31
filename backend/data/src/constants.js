// Default categories shown in the UI. Users can also type a custom category,
// so the backend does not hard-restrict transaction.category to this list —
// it only validates length/format. Kept here as the single source of truth
// for the "known" set used by the frontend dropdown.
const DEFAULT_CATEGORIES = ["Food", "Travel", "Bills", "Shopping", "Salary", "Health", "Other"];

module.exports = { DEFAULT_CATEGORIES };
