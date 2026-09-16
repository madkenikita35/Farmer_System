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

const User = require("../models/User");
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


/**
 * Builds the signed token we hand to the browser after a successful
 * login/signup.
 *
 * We put ONLY the user's id inside it. We deliberately do NOT rely on a
 * role stored in the token - middleware/auth.js re-reads the role from
 * the database each time, so role changes take effect immediately.
 */
function createToken(userId) {
  return jwt.sign(
    { id: userId }, // the "payload" - what's inside the token
    process.env.JWT_SECRET, // the secret that signs it (keep this safe!)
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } // auto-expires
  );
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
    res.status(201).json({
      message: "Account created successfully",
      token: createToken(user._id),
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

    res.status(200).json({
      message: "Logged in successfully",
      token: createToken(user._id),
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
// "Who am I?" The frontend calls this when the page is refreshed: the
// browser still has the token in localStorage, but React's memory was
// wiped by the reload, so it asks the server to confirm the token is
// still valid and re-fetch the user's details.
//
// This is ALSO what stops a clever user from editing localStorage to
// say role:"admin" - the server re-reads the real role from MongoDB.
// ---------------------------------------------------------------------
async function getMe(req, res) {
  // `protect` already looked the user up and put them on req.user,
  // so there's genuinely nothing left to do here.
  res.status(200).json({ user: publicUserFields(req.user) });
}

// ---------------------------------------------------------------------
// POST /api/auth/logout   (protected)
//
// With JWTs there's nothing to "destroy" on the server - the token
// lives in the browser, and the browser simply throws it away. So this
// endpoint exists purely so the admin's activity feed can show logouts.
// ---------------------------------------------------------------------
async function logout(req, res) {
  await logActivity(req.user, "LOGOUT", `${req.user.name} logged out`);
  res.status(200).json({ message: "Logged out successfully" });
}

module.exports = { signup, login, getMe, logout };
