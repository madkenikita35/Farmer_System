// config/seedUsers.js
// -----------------------------------------------------------------------
// "Seeding" means: putting some starter data into an empty database so
// the app is usable the moment you run it.
//
// The problem this solves: farmers can sign up from the website, but
// the signup route hard-codes role:"farmer" (on purpose - see
// authController.js). So there would be NO way to ever get an admin
// account. This file creates one automatically on server startup.
//
// It runs every time the server starts, but it only CREATES accounts
// that don't already exist - so restarting the server won't wipe your
// data or reset a password you changed. That check is the `findOne`
// below.
//
// ⚠️  THE PASSWORDS LIVE IN .env AND NOWHERE ELSE.
//     They are deliberately NOT printed to the console and NOT shown
//     on the login page - an admin password on a public login screen
//     hands anyone who visits the site full access.
//
//     Change them in .env before putting this app anywhere real. If you
//     change an email there, a NEW account is created; the old one stays
//     until you delete it from MongoDB yourself.
// -----------------------------------------------------------------------

const User = require("../models/User");

/**
 * Creates one user if - and only if - nobody with that email exists yet.
 * Returns true if it actually created someone, false if it skipped.
 */
async function createUserIfMissing({ name, email, password, role, state }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return false; // already there - leave it completely alone
  }

  // We use User.create() (not insertMany or updateOne) specifically so
  // the pre("save") hook in models/User.js runs and HASHES the password.
  await User.create({ name, email, password, role, state: state || "" });
  return true;
}

/**
 * Called once from server.js, just after MongoDB connects.
 */
async function seedDefaultUsers() {
  try {
    // Read the default accounts from .env so the passwords aren't
    // hard-coded into a file that gets committed to git.
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const farmerEmail = process.env.DEFAULT_FARMER_EMAIL;
    const farmerPassword = process.env.DEFAULT_FARMER_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn(
        "⚠️  DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD missing from .env - no admin was created."
      );
      return;
    }

    const adminCreated = await createUserIfMissing({
      name: "Admin",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });

    if (adminCreated) {
      console.log(`👑 Admin account created -> ${adminEmail} (password taken from .env)`);
    } else {
      console.log(`👑 Admin account already exists   -> ${adminEmail}`);
    }

    // A demo farmer too, so you can immediately test the farmer side of
    // the app without having to sign up first.
    if (farmerEmail && farmerPassword) {
      const farmerCreated = await createUserIfMissing({
        name: "Demo Farmer",
        email: farmerEmail,
        password: farmerPassword,
        role: "farmer",
        state: "Maharashtra",
      });

      if (farmerCreated) {
        console.log(`🧑‍🌾 Demo farmer account created -> ${farmerEmail} (password taken from .env)`);
      } else {
        console.log(`🧑‍🌾 Demo farmer already exists    -> ${farmerEmail}`);
      }
    }
  } catch (error) {
    // Seeding failing shouldn't stop the server from starting - the app
    // still works, you just won't have a default admin to log in with.
    console.error("❌ Could not seed default users:", error.message);
  }
}

module.exports = seedDefaultUsers;
