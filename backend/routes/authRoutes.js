// routes/authRoutes.js
// -----------------------------------------------------------------------
// Maps the login/signup URLs to the functions in authController.js.
//
// Notice the `loginLimiter` on the two public routes. That's a RATE
// LIMIT: it allows only a handful of attempts from the same IP address
// within a time window. Without it, someone could write a script that
// tries thousands of passwords a minute against a real farmer's email
// (a "brute-force attack"). With it, they get locked out after 10 tries.
// -----------------------------------------------------------------------

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { signup, login, getMe, logout } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Allow at most 10 login/signup attempts per IP every 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    message: "Too many attempts from this device. Please wait 15 minutes and try again.",
  },
  standardHeaders: true, // send the standard RateLimit-* response headers
  legacyHeaders: false, // don't send the old X-RateLimit-* ones
});

// ---- Public routes (no token needed - you can't have one yet!) ----

// POST /api/auth/signup  - create a farmer account
router.post("/signup", loginLimiter, signup);

// POST /api/auth/login   - log in as EITHER a farmer or an admin.
// There is only this ONE login route. The response includes the user's
// role, and the frontend uses it to decide which site to open. See the
// long comment at the top of controllers/authController.js.
router.post("/login", loginLimiter, login);

// ---- Protected routes (you must send a valid token) ----

// GET /api/auth/me       - "who am I?", used after a page refresh
router.get("/me", protect, getMe);

// POST /api/auth/logout  - records the logout in the activity feed
router.post("/logout", protect, logout);

module.exports = router;
