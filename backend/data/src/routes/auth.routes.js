const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const db = require("../db");
const { handleValidation } = require("../middleware/errorHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Auth endpoints are brute-force sensitive — tighter rate limit than the general API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2–80 characters."),
    body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters.")
      .matches(/\d/)
      .withMessage("Password must include at least one number."),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }

      const passwordHash = bcrypt.hashSync(password, 12);
      const info = db
        .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
        .run(name, email, passwordHash);

      const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(info.lastInsertRowid);
      const token = signToken(user);

      res.status(201).json({ token, user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      // Same generic message whether the email or password is wrong —
      // avoids leaking which accounts exist.
      const invalid = () => res.status(401).json({ error: "Invalid email or password." });

      if (!user) return invalid();

      const ok = bcrypt.compareSync(password, user.password_hash);
      if (!ok) return invalid();

      const token = signToken(user);
      res.json({ token, user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", requireAuth, (req, res, next) => {
  try {
    const user = db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
