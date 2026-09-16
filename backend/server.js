// server.js
// -----------------------------------------------------------------------
// This is the ENTRY POINT of our backend. When you run "npm run dev",
// this is the file that actually starts.
//
// Its job is small on purpose:
//   1. Load environment variables (.env)
//   2. Connect to MongoDB
//   3. Set up Express (our web server) with security + the routes we need
//   4. Create the default admin account if it doesn't exist yet
//   5. Start listening for requests
//
// All the real logic lives in controllers/ and services/ - this file
// just wires everything together.
// -----------------------------------------------------------------------

require("dotenv").config(); // loads variables from .env into process.env

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const connectDB = require("./config/db");
const seedDefaultUsers = require("./config/seedUsers");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const mandiRoutes = require("./routes/mandiRoutes");

const app = express();

// =======================================================================
// SECURITY MIDDLEWARE
// These run on EVERY request, before any of our own code. Each one
// closes off a specific, well-known way web apps get attacked.
// =======================================================================

// --- 1. helmet(): sets a bundle of protective HTTP response headers ---
// Browsers read these headers and then refuse to do dangerous things.
// The main ones it sets for us:
//
//   Content-Security-Policy   - only load scripts/styles from places we
//                               approve, which blocks most XSS attacks
//                               (someone injecting <script> into a page)
//   X-Content-Type-Options    - stop the browser "guessing" that a .txt
//                               file is really JavaScript and running it
//   X-Frame-Options           - stop other websites putting our app in a
//                               hidden <iframe> and tricking users into
//                               clicking things ("clickjacking")
//   Strict-Transport-Security - once on HTTPS, never fall back to HTTP
//   X-DNS-Prefetch-Control    - don't leak which domains we talk to
//
// You get all of that from this one line, which is why helmet is the
// standard first thing added to any real Express app.
app.use(
  helmet({
    // We serve uploaded receipt images from this server, and the React
    // frontend on port 5173 displays them in <img> tags. The strictest
    // default would block that cross-origin image load, so we relax
    // just this one setting.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// --- 2. CORS: who is allowed to call this API from a browser? ---
// Before, this was a bare cors() - meaning ANY website on the internet
// could call our API from a user's browser. Now we name the exact
// origin our frontend runs on, so nobody else's site can.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // allow the Authorization header through
  })
);

// --- 3. Body size limit ---
// express.json() lets us read JSON request bodies (req.body). The
// "limit" stops someone crashing the server by POSTing a 500 MB body.
// 2mb is generous for our JSON (the OCR raw text can be long).
app.use(express.json({ limit: "2mb" }));

// --- 4. A general rate limit across the whole API ---
// The stricter login-specific limit lives in routes/authRoutes.js. This
// broader one just stops any single IP hammering the server overall.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per IP per window - plenty for normal use
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down and try again shortly." },
});
app.use("/api", generalLimiter);

// Serve uploaded receipt images statically, e.g.
// http://localhost:5000/uploads/1234-receipt.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================================================================
// ROUTES
// =======================================================================
// PUBLIC - you can reach these without logging in (you have to be able
// to, or you could never log in in the first place!)
app.use("/api/auth", authRoutes);

// PROTECTED - each of these route files starts with router.use(protect),
// so they all require a valid login token. Open any of them to see.
app.use("/api/receipts", receiptRoutes);
app.use("/api/mandi", mandiRoutes);

// ADMIN ONLY - adminRoutes.js uses router.use(protect, adminOnly)
app.use("/api/admin", adminRoutes);

// A simple health-check route, handy for confirming the server is alive.
app.get("/", (req, res) => {
  res.send("🌾 Mandi Price Checker API is running!");
});

// =======================================================================
// ERROR HANDLING
// =======================================================================
// If no route above matched the URL, we end up here: a clean 404 instead
// of Express's default HTML error page.
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// A "catch-all" error handler. Express recognises this as an error
// handler specifically because it takes FOUR arguments (err first).
// Anything a controller throws and doesn't catch lands here.
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);

  // Never send the raw error/stack trace to the browser in production -
  // stack traces can reveal file paths and library versions that help
  // an attacker. In development we DO show it, because it's useful.
  const isDevelopment = process.env.NODE_ENV !== "production";

  res.status(err.status || 500).json({
    message: "Something went wrong on the server.",
    ...(isDevelopment && { error: err.message }),
  });
});

const PORT = process.env.PORT || 5000;

// Connect to the database FIRST, then seed the default admin, then
// start the server. (No point accepting requests if the database isn't
// ready, and no point starting without an admin account existing.)
connectDB()
  .then(() => seedDefaultUsers())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  });
