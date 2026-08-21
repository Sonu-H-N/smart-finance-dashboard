const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || "./data/finance.db");

// Ensure the data directory exists before opening the file
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Apply schema (idempotent — safe to run on every boot, acts as our migration runner)
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

module.exports = db;
