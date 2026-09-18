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
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");

const checkSecrets = require("./config/checkSecrets");
const connectDB = require("./config/db");
const seedDefaultUsers = require("./config/seedUsers");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const mandiRoutes = require("./routes/mandiRoutes");
const trendRoutes = require("./routes/trendRoutes");
const cedaRoutes = require("./routes/cedaRoutes");
const locationRoutes = require("./routes/locationRoutes");
const voiceRoutes = require("./routes/voiceRoutes");

// Refuse to boot on placeholder secrets in production - see the file.
checkSecrets();

const app = express();

// Behind a load balancer or hosting platform (Render, Railway, Heroku,
// nginx) the real client protocol and IP arrive in X-Forwarded-* headers.
// Without this, req.secure is always false and the rate limiter sees
// every request as coming from the proxy's single IP - so one abusive
// client could exhaust the limit for everybody.
app.set("trust proxy", 1);

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
    // The React frontend runs on a different origin (port 5173) and
    // fetches receipt images from this server, so the strictest
    // same-origin policy would block them. Those images are still
    // access-controlled - see GET /api/receipts/image/:filename.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// --- 1b. Force HTTPS in production ---
// Tokens and passwords travel in these requests. Over plain HTTP anyone
// on the same network can read them, so in production we bounce HTTP
// requests to HTTPS instead of serving them. Left off in development,
// where there is no certificate and everything is on localhost.
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // `req.secure` is only trustworthy because of the "trust proxy"
    // setting above; the header check covers proxies that don't set it.
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      return next();
    }
    return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  });
}

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

// --- 3b. cookie-parser: read the refresh-token cookie ---
// The refresh token lives in an HttpOnly cookie that JavaScript in the
// browser cannot touch. This is what lets the SERVER read it, as
// req.cookies.mandi_refresh - see controllers/authController.js.
app.use(cookieParser());

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

// NOTE: uploaded receipt images are deliberately NOT served statically.
//
// There used to be an `app.use("/uploads", express.static(...))` here,
// which put every uploaded receipt on the public internet - no login
// needed, and the filenames ("<timestamp>-<original name>") were easy to
// guess. Receipt photos carry names, addresses, GSTINs and prices, so
// that was a PII leak open to anyone.
//
// They are now served by GET /api/receipts/image/:filename, which sits
// behind `protect` and checks the requester actually owns the receipt.
// See getReceiptImage() in controllers/receiptController.js.

// --- 5. Never cache API responses ---
// Almost every endpoint here returns data specific to the logged-in
// user - their receipts, their dashboard, their profile. Without an
// explicit instruction, a browser or a shared proxy is free to store
// those responses and can hand one user's data to the next person on
// the same machine or network.
//
// "private"  = only the end user's own browser may cache this, never a
//              shared proxy.
// "no-store" = actually, don't keep it at all.
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  res.set("Pragma", "no-cache");
  next();
});

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

// Crop price trends over time, built from our farmers' receipts.
// (The government feed cannot serve this - it is a single-day
// snapshot. See services/priceTrendService.js for the details.)
app.use("/api/prices", trendRoutes);

// CEDA Agmarknet: real price HISTORY, which data.gov.in cannot give us.
// Mounted at the root of /api because the paths are /api/crops and
// /api/locations rather than sitting under a prefix.
app.use("/api", cedaRoutes);

// Pincode / address / lat-lon -> one set of coordinates, so the rest of
// the app never learns there are several ways to say where you are.
app.use("/api/location", locationRoutes);
app.use("/api/voice", voiceRoutes);

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

// =======================================================================
// LAST-RESORT CRASH GUARDS
// =======================================================================
// Express only catches errors thrown inside its own request handling. An
// error raised by a background worker or a stray promise lands outside
// that, and Node's default response is to print it and KILL THE PROCESS.
//
// That was not theoretical here: a malformed image upload crashed the
// OCR worker, and the whole server exited. validateImage() in
// services/ocrService.js now blocks that specific route in, but these
// handlers make sure the NEXT unforeseen async error degrades into a log
// line rather than an outage.
//
// We deliberately keep serving. An uncaught exception can in principle
// leave the process in an unknown state - the textbook advice is to exit
// and let a process manager restart you. This app has no process manager
// configured, so exiting means staying down until someone notices. A
// logged error and a live server is the better trade here; if you deploy
// behind pm2/systemd/Docker with a restart policy, switch this to
// `process.exit(1)` and let the supervisor bring it back cleanly.
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception (server kept running):", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled promise rejection (server kept running):", reason);
});

const PORT = process.env.PORT || 5000;

// Connect to the database FIRST, then seed the default admin, then
// start the server. (No point accepting requests if the database isn't
// ready, and no point starting without an admin account existing.)
connectDB()
  .then(() => seedDefaultUsers())
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // ---- A failure to START must be fatal ----
    //
    // Without this, a bind failure is thrown asynchronously, the
    // uncaughtException handler above catches it, logs it, and the
    // process KEEPS RUNNING - connected to the database, holding
    // memory, listening to nothing.
    //
    // That is genuinely worse than exiting. The zombie looks alive in
    // the task list, so a restart appears to have worked while an older
    // instance quietly carries on serving the OLD code. That wasted
    // real debugging time: tests were passing against a server that was
    // not the one just started.
    //
    // The uncaughtException guard is there to survive a bad request
    // mid-flight. Never having started at all is not something to
    // survive - there is nothing to serve.
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `❌ Port ${PORT} is already in use - another copy of this server is ` +
            `probably still running.\n` +
            `   Find it with:  netstat -ano | findstr :${PORT}\n` +
            `   Then stop it:  taskkill /PID <pid> /F`
        );
      } else {
        console.error("❌ Could not start the server:", error);
      }

      process.exit(1);
    });
  })
  // Same reasoning for the startup chain itself: if the database is
  // unreachable or seeding fails, there is no working server to keep
  // alive. Without this .catch() the rejection reaches the
  // unhandledRejection handler and leaves another do-nothing process.
  .catch((error) => {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  });
