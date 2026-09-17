// models/RefreshToken.js
// -----------------------------------------------------------------------
// One row per logged-in browser.
//
// ---------------------------------------------------------------------
// WHY THIS TABLE EXISTS AT ALL
// ---------------------------------------------------------------------
// The app used to hand the browser one long-lived JWT (7 days) and keep
// it in localStorage. That had two problems:
//
//   1. localStorage is readable by ANY JavaScript on the page. One XSS
//      bug anywhere - in our code or in a library we pull in - and the
//      attacker reads the token and becomes that farmer for a week.
//
//   2. A JWT cannot be cancelled. Once signed, it is valid until it
//      expires. "Log out everywhere" was impossible.
//
// The fix is two tokens with different jobs:
//
//   ACCESS token   - short-lived (15 min), lives ONLY in a JavaScript
//                    variable in the tab. Never written to any storage.
//                    Gone the moment the tab closes.
//
//   REFRESH token  - long-lived (30 days), lives ONLY in an HttpOnly
//                    cookie. JavaScript literally cannot read it, so
//                    XSS cannot steal it. Its one power is to mint a
//                    new access token.
//
// This table is the server's list of refresh tokens it will still
// honour. Because the server holds the list, logout can DELETE a row
// and that session is dead immediately - which a plain JWT could never
// give us.
//
// ---------------------------------------------------------------------
// WHY WE STORE A HASH AND NOT THE TOKEN
// ---------------------------------------------------------------------
// Exactly the same reasoning as passwords. If someone got a copy of
// this collection, plaintext tokens would let them log in as every user
// on the system. Hashes are useless to them: you cannot turn the hash
// back into the token the cookie needs to send.
//
// Unlike a password, a refresh token is 64 random bytes rather than
// something a human chose, so there is nothing to brute-force and a
// plain SHA-256 is the right tool. bcrypt here would only make every
// refresh slower for no extra safety.
// -----------------------------------------------------------------------

const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    // SHA-256 of the random token we put in the cookie. Never the token.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Whose session this is.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // When this session stops being valid.
    //
    // `expires: 0` tells MongoDB to DELETE the row by itself once this
    // date passes - a built-in feature called a TTL index. Without it
    // the collection would grow forever with dead sessions.
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },

    // Purely so an admin can recognise a session in a list
    // ("Chrome on Android"). Never used for any security decision -
    // a client can claim to be anything it likes.
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
