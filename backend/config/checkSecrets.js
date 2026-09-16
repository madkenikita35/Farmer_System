// config/checkSecrets.js
// -----------------------------------------------------------------------
// A startup check that the app is not running on placeholder secrets.
//
// WHY THIS EXISTS
// Secrets live in .env, which is correct - they're out of the source and
// out of git. But nothing stopped the app BOOTING with the sample values
// still in place. The shipped JWT_SECRET literally contains the words
// "change_this_in_production", and anyone who has read this project's
// setup notes could forge a login token for any account with it.
//
// So in production we refuse to start. Failing loudly at deploy time is
// far better than running for months with a publicly-known signing key.
// In development we only warn, so nobody is blocked while learning.
// -----------------------------------------------------------------------

// Text that means "nobody has set this yet".
const PLACEHOLDER_MARKERS = [
  "change_this",
  "changeme",
  "your_secret",
  "your-secret",
  "replace_me",
  "secret_key_here",
];

// A JWT signing key shorter than this is brute-forceable offline.
const MINIMUM_SECRET_LENGTH = 32;

function checkSecrets() {
  const isProduction = process.env.NODE_ENV === "production";
  const problems = [];

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    problems.push("JWT_SECRET is not set.");
  } else {
    if (jwtSecret.length < MINIMUM_SECRET_LENGTH) {
      problems.push(
        `JWT_SECRET is only ${jwtSecret.length} characters - use at least ${MINIMUM_SECRET_LENGTH}.`
      );
    }
    const lowered = jwtSecret.toLowerCase();
    if (PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker))) {
      problems.push("JWT_SECRET still contains placeholder text from the example file.");
    }
  }

  if (!process.env.MONGO_URI) {
    problems.push("MONGO_URI is not set.");
  }

  if (problems.length === 0) return;

  const banner = problems.map((problem) => `   - ${problem}`).join("\n");

  if (isProduction) {
    console.error("\n❌ Refusing to start - insecure configuration:\n" + banner);
    console.error(
      "\n   Generate a strong secret with:\n" +
        "   node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"\n"
    );
    process.exit(1);
  }

  console.warn(
    "\n⚠️  Insecure configuration (allowed in development only):\n" + banner + "\n"
  );
}

module.exports = checkSecrets;
