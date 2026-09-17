// controllers/authController.js
// -----------------------------------------------------------------------
// Everything to do with WHO you are:
//   1. signup  -> create a new farmer account
//   2. login   -> check email + password, hand back a token
//   3. getMe   -> "who am I?" (used when the page reloads)
//   4. logout  -> just writes an activity log entry (see note below)
//
// THE ONE IDEA TO UNDERSTAND HERE: the "token".
// HTTP is stateless - the server forgets you between requests. So after
// a successful login we give the browser a signed token, and the browser
// sends it back on every future request. middleware/auth.js reads it.
//
// ABOUT ROLES (this is the bit your project specifically needed):
// The login response includes the user's role, straight from MongoDB.
// The FRONTEND then uses that role to decide where to send them:
//   role === "admin"  -> redirect to /admin
//   role === "farmer" -> redirect to /
// That's why there is NO separate "admin login" button anywhere - one
// login form, and the SERVER decides what you are. A farmer typing the
// admin URL by hand still gets blocked, because every admin API route
// is guarded by adminOnly (see middleware/auth.js). The frontend
// redirect is just convenience; the backend guard is the real security.
// -----------------------------------------------------------------------

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { logActivity } = require("../services/activityService");

// ---------------------------------------------------------------------
// SECURITY: every credential field must be a plain string.
//
// Express parses JSON bodies, so a caller can send
//     {"email": {"$ne": null}, "password": {"$ne": null}}
// and that object goes straight into a Mongoose query. That is NoSQL
// injection - the classic version of it returns "the first user whose
// email is not null" and logs the attacker in as them.
//
// It did not actually bypass login here (the code calls
// email.toLowerCase(), which throws on an object), but it crashed the
// handler into a 500 on hostile input, which is both noisy and a poor
// thing to rely on. An explicit type check is the actual control.
// ---------------------------------------------------------------------
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}


// =====================================================================
// THE TWO TOKENS
// =====================================================================
// Read the long comment at the top of models/RefreshToken.js first -
// it explains WHY there are two. In short:
//
//   ACCESS  - 15 minutes, returned in the JSON body, kept only in a
//             JavaScript variable in the tab. Sent as
//             "Authorization: Bearer ..." on every request.
//
//   REFRESH - 30 days, set as an HttpOnly cookie that JavaScript
//             cannot read. Its only job is to mint a new access token.
//
// The access token being short-lived is what makes the whole thing
// work: even if one were somehow stolen, it is useless within minutes,
// and the valuable long-lived credential was never reachable from JS.
// =====================================================================

const REFRESH_COOKIE_NAME = "mandi_refresh";

// How long a refresh token (and therefore a "stay logged in") lasts.
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);

/**
 * The SHORT-LIVED token the browser sends on every API call.
 *
 * We put ONLY the user's id inside it. We deliberately do NOT rely on a
 * role stored in the token - middleware/auth.js re-reads the role from
 * the database each time, so role changes take effect immediately.
 */
function createAccessToken(userId) {
  return jwt.sign(
    { id: userId }, // the "payload" - what's inside the token
    process.env.JWT_SECRET, // the secret that signs it (keep this safe!)
    // Deliberately short. This used to be 7 days, which meant a stolen
    // token was good for a week. Now a stolen one dies in minutes, and
    // the browser quietly asks for a fresh one using the cookie.
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
}

/**
 * The options used both when SETTING and when CLEARING the refresh
 * cookie. They must match exactly or the browser will not replace or
 * remove the cookie - a classic "logout does not log out" bug.
 */
function refreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    // THE IMPORTANT ONE. httpOnly means document.cookie cannot see it,
    // so a script injected into our page cannot steal it.
    httpOnly: true,

    // Only ever sent over HTTPS in production. Left off in development
    // because localhost is plain http and the cookie would be dropped.
    secure: isProduction,

    // "strict" means the browser refuses to attach this cookie to any
    // request that started from another site, which removes CSRF as a
    // concern for the refresh endpoint.
    //
    // If the frontend is ever hosted on a DIFFERENT domain from the
    // API, this has to become "none" (with secure: true), because
    // "strict" would block the cookie on the cross-site call. Today
    // they share a domain, so "strict" is both safe and correct.
    sameSite: "strict",

    // Limits the cookie to the auth routes. It is pointless sending it
    // to /api/mandi or /api/receipts, and not sending it is one fewer
    // place it can leak from (a log, a proxy, a crash dump).
    path: "/api/auth",

    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  };
}

/** Refresh tokens are random, not signed - so we hash them for storage. */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a refresh token, records its HASH against the user, and sets
 * the cookie on the response.
 *
 * Called on login, on signup, and on every refresh (rotation).
 */
async function issueRefreshToken(user, req, res) {
  // 64 random bytes. Not a JWT: there is nothing to read inside it and
  // nothing for an attacker to tamper with. It is simply a long
  // unguessable string that points at a row in the database.
  const token = crypto.randomBytes(64).toString("hex");

  await RefreshToken.create({
    tokenHash: hashToken(token),
    user: user._id,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
  });

  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

/**
 * A small helper so we never accidentally send the password hash to the
 * browser. Whenever we return a user, we return THIS shape only.
 */
function publicUserFields(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    state: user.state,
    createdAt: user.createdAt,
  };
}

// ---------------------------------------------------------------------
// POST /api/auth/signup
// Body: { name, email, password, phone?, state? }
//
// Creates a FARMER account. Notice we never read `role` from req.body -
// that's on purpose. If we did, anyone could POST { role: "admin" } and
// make themselves an admin. Admin accounts are created only by the
// seed script (see config/seedUsers.js).
// ---------------------------------------------------------------------
async function signup(req, res) {
  try {
    const { name, email, password, phone, state } = req.body;

    // --- Validation: check the basics before touching the database ---
    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        message: "Please provide your name, email and password.",
      });
    }

    // Optional fields must still be strings if present - they end up in
    // the database and, for `state`, inside a query later on.
    if ((phone !== undefined && typeof phone !== "string") ||
        (state !== undefined && typeof state !== "string")) {
      return res.status(400).json({ message: "Phone and state must be text." });
    }

    // A basic shape check. The real validation is that a person can
    // receive mail at it, which we can't test here - this just rejects
    // obvious nonsense before it reaches the database.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    // Is this email already taken? (emails are stored lowercase, so we
    // lowercase what was typed before comparing)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists. Try logging in.",
      });
    }

    // Create the user. The password gets hashed automatically by the
    // pre("save") hook inside models/User.js - we never do it here.
    const user = await User.create({
      name,
      email,
      password,
      phone: phone || "",
      state: state || "",
      role: "farmer", // hard-coded - see the comment above this function
    });

    await logActivity(user, "SIGNUP", `${user.name} created a farmer account`);

    // Log them straight in after signing up, so they don't have to type
    // their password again on the very next screen.
    //
    // The refresh token goes out as an HttpOnly cookie; only the
    // short-lived access token is in the body, and the browser keeps
    // that in memory alone.
    await issueRefreshToken(user, req, res);

    res.status(201).json({
      message: "Account created successfully",
      accessToken: createAccessToken(user._id),
      user: publicUserFields(user),
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Something went wrong creating your account." });
  }
}

// ---------------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
//
// Returns { token, user } - and `user.role` is what the frontend uses
// to decide whether to open the farmer site or the admin site.
// ---------------------------------------------------------------------
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: "Please enter your email and password." });
    }

    // Remember `select: false` on the password field in User.js? That
    // means it is NOT returned by default. Here we DO need it, so we
    // explicitly ask for it with .select("+password").
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    // SECURITY NOTE: we give the exact same message whether the email
    // doesn't exist OR the password is wrong. If we said "no such
    // email", an attacker could use the login form to discover which
    // email addresses are registered. Same message = no free hints.
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact the admin.",
      });
    }

    // Remember when they last logged in - the admin dashboard shows this.
    user.lastLoginAt = new Date();
    await user.save();

    await logActivity(user, "LOGIN", `${user.name} logged in`);

    await issueRefreshToken(user, req, res);

    res.status(200).json({
      message: "Logged in successfully",
      accessToken: createAccessToken(user._id),
      user: publicUserFields(user),
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Something went wrong logging you in." });
  }
}

// ---------------------------------------------------------------------
// GET /api/auth/me   (protected - needs a valid token)
//
// "Who am I?" Called after /refresh has handed the tab a new access
// token, to fill in the user's details.
//
// The role in the answer comes straight from MongoDB every time, so
// there is no stored copy anywhere for a user to tamper with. (There
// used to be one in localStorage; it is gone - see AuthContext.jsx.)
// ---------------------------------------------------------------------
async function getMe(req, res) {
  // `protect` already looked the user up and put them on req.user,
  // so there's genuinely nothing left to do here.
  res.status(200).json({ user: publicUserFields(req.user) });
}

// ---------------------------------------------------------------------
// POST /api/auth/refresh   (PUBLIC - no access token needed)
//
// This is what keeps a farmer logged in across a page refresh now that
// nothing is stored in the browser. The tab starts with no token at
// all, calls this, and the HttpOnly cookie the browser attaches
// automatically proves who it is.
//
// ROTATION: the old refresh token is deleted and a new one issued on
// every call, so a refresh token is single-use. If one is ever captured
// and replayed it has almost certainly already been spent, and the
// replay simply fails.
//
// It is deliberately NOT behind `protect` - the whole point is that the
// caller has no valid access token yet.
// ---------------------------------------------------------------------
async function refresh(req, res) {
  try {
    const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;

    if (!token) {
      return res.status(401).json({ message: "Not logged in." });
    }

    const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });

    // Unknown, already-used, or expired token. Clear the cookie so the
    // browser stops sending a dead value on every load.
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await RefreshToken.deleteOne({ _id: stored._id });
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res
        .status(401)
        .json({ message: "Your session has expired. Please log in again." });
    }

    const user = await User.findById(stored.user);

    // The account was deleted or deactivated since this session began.
    // Checked here as well as in `protect`, because this route runs
    // without `protect`.
    if (!user || !user.isActive) {
      await RefreshToken.deleteOne({ _id: stored._id });
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res
        .status(401)
        .json({ message: "Your session is no longer valid. Please log in again." });
    }

    // ---- Rotate: burn the old one, hand out a new one ----
    await RefreshToken.deleteOne({ _id: stored._id });
    await issueRefreshToken(user, req, res);

    res.status(200).json({
      accessToken: createAccessToken(user._id),
      user: publicUserFields(user),
    });
  } catch (error) {
    console.error("Error refreshing session:", error);
    res.status(500).json({ message: "Could not refresh your session." });
  }
}

// ---------------------------------------------------------------------
// POST /api/auth/logout   (protected)
//
// Unlike the old version, this now genuinely ENDS the session: the
// refresh token row is deleted, so the cookie the browser still holds
// is worthless the instant this returns. Previously a JWT stayed valid
// until it expired and there was nothing the server could do about it.
// ---------------------------------------------------------------------
async function logout(req, res) {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;

  if (token) {
    await RefreshToken.deleteOne({ tokenHash: hashToken(token) });
  }

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

  await logActivity(req.user, "LOGOUT", `${req.user.name} logged out`);
  res.status(200).json({ message: "Logged out successfully" });
}

// ---------------------------------------------------------------------
// POST /api/auth/logout-all   (protected)
//
// Ends EVERY session for this user, on every device. Worth having: if a
// farmer thinks someone else has been in their account, this is the one
// button that actually fixes it. It was impossible with the old scheme.
// ---------------------------------------------------------------------
async function logoutEverywhere(req, res) {
  await RefreshToken.deleteMany({ user: req.user._id });
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

  await logActivity(req.user, "LOGOUT", `${req.user.name} logged out of all devices`);
  res.status(200).json({ message: "Logged out of all devices" });
}

module.exports = { signup, login, getMe, refresh, logout, logoutEverywhere };
