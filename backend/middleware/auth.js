// middleware/auth.js
// -----------------------------------------------------------------------
// "Middleware" is just a function that runs BEFORE your controller does.
// It gets (req, res, next) and can either:
//   - call next()  -> "all good, carry on to the controller"
//   - send a response itself -> "stop here, the request is rejected"
//
// This file has the two guards that make role-based access work:
//
//   protect    -> "you must be logged in"        (farmer OR admin)
//   adminOnly  -> "you must be an admin"         (used AFTER protect)
//
// You use them in a route file like this:
//
//   router.get("/farmers", protect, adminOnly, getAllFarmers);
//                          ^^^^^^^  ^^^^^^^^^
//                          runs 1st  runs 2nd    then the controller
//
// HOW DOES THE SERVER KNOW WHO YOU ARE?
// When you log in, the server gives your browser a JWT ("JSON Web
// Token") - a long string that says "this is user 123, role farmer",
// signed with our secret key so nobody can fake or edit it.
//
// The browser then sends that token back on every request, in a header:
//
//   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//
// `protect` below reads that header, verifies the signature, looks the
// user up in MongoDB, and hangs them on `req.user` so every controller
// after it can just use req.user without repeating any of this work.
// -----------------------------------------------------------------------

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * GUARD 1: "You must be logged in."
 *
 * On success it sets `req.user` to the full user document (minus the
 * password) and calls next(). On failure it replies 401 Unauthorized.
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    // We expect the header to look like: "Bearer <token>"
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "You need to log in to use this. (No token was sent.)",
      });
    }

    // Everything after the word "Bearer " is the token itself.
    const token = authHeader.split(" ")[1];

    // jwt.verify() does TWO things:
    //   1. checks the signature is really ours (nobody tampered with it)
    //   2. checks it hasn't expired
    // If either fails it THROWS, and we land in the catch block below.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // The token only carries the user's id. We deliberately look the
    // user up fresh from the database on every request, rather than
    // trusting the role stored inside the token. Why? So that if an
    // admin deactivates a farmer, that takes effect IMMEDIATELY -
    // rather than whenever their old token happens to expire.
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "That account no longer exists. Please log in again.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact the admin.",
      });
    }

    req.user = user; // <- every controller after this can use req.user
    next(); // carry on
  } catch (error) {
    // jwt.verify throws for an expired token, a tampered token, or junk.
    // We give the same generic message for all of them on purpose:
    // telling an attacker exactly WHY their token failed is a small
    // free hint we don't need to give them.
    return res.status(401).json({
      message: "Your session has expired or is invalid. Please log in again.",
    });
  }
}

/**
 * GUARD 2: "You must be an admin."
 *
 * This MUST be used after `protect`, because it relies on req.user
 * already having been filled in.
 *
 * Note it returns 403 Forbidden, not 401 Unauthorized. The difference:
 *   401 = "I don't know who you are"      (you're not logged in)
 *   403 = "I know who you are, and no"    (you're logged in, but a farmer)
 */
function adminOnly(req, res, next) {
  // The `&&` here is a safety net in case someone forgets to put
  // `protect` before this one in a route.
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    message: "Admins only. You don't have permission to view this.",
  });
}

module.exports = { protect, adminOnly };
