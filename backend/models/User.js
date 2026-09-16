// models/User.js
// -----------------------------------------------------------------------
// This model describes ONE PERSON who can log into the app.
//
// There are exactly TWO kinds of person (this is the "role based access"
// part of the app):
//
//   role = "farmer"  -> a normal user. Can upload receipts, check rates,
//                       and see their own dashboard.
//   role = "admin"   -> the person running the app. Can ALSO see the
//                       admin site: how many farmers signed up, what
//                       they've been doing, overall statistics, etc.
//
// The role is stored HERE, in the database - NOT sent from the browser.
// That's important: if the browser could tell us "I am an admin", then
// anybody could just edit the request and become an admin. Instead, the
// browser sends only an email + password, and the SERVER looks up the
// role from this collection. See controllers/authController.js.
//
// PASSWORDS ARE NEVER STORED AS PLAIN TEXT.
// We store a bcrypt "hash" instead - a scrambled, one-way version of
// the password. Even if someone stole the whole database, they still
// couldn't read anybody's password. See the pre("save") hook below.
// -----------------------------------------------------------------------

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
      trim: true, // removes accidental spaces at the start/end
    },

    email: {
      type: String,
      required: [true, "Please enter an email address"],
      unique: true, // two people can't sign up with the same email
      lowercase: true, // "Ram@Mail.com" and "ram@mail.com" are the SAME person
      trim: true,
    },

    // This holds the HASHED password, never the real one.
    password: {
      type: String,
      required: [true, "Please enter a password"],
      minlength: [6, "Password must be at least 6 characters"],
      // "select: false" means: when we do User.find(), DON'T include this
      // field by default. So we can never accidentally send the password
      // hash back to the browser. When we DO need it (at login time), we
      // ask for it explicitly with .select("+password").
      select: false,
    },

    // The whole point of this file. Only these two values are allowed -
    // "enum" makes MongoDB reject anything else.
    role: {
      type: String,
      enum: ["farmer", "admin"],
      default: "farmer", // anyone signing up from the website is a farmer
    },

    // Extra profile details a farmer may fill in. Optional - we don't
    // want to block someone from signing up just because they didn't
    // want to type their village name.
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },

    // An admin can "deactivate" a farmer instead of deleting them
    // (deleting would also orphan their receipts). A deactivated user
    // simply can't log in any more - see authController.login().
    isActive: {
      type: Boolean,
      default: true,
    },

    // Handy for the admin dashboard's "who's been active lately?" list.
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Adds "createdAt" and "updatedAt" automatically. "createdAt" is
    // what the admin dashboard uses as the farmer's "enrolled on" date.
    timestamps: true,
  }
);

// ---------------------------------------------------------------------
// A "pre-save hook" is code that runs automatically JUST BEFORE a user
// document is saved to MongoDB. We use it to hash the password.
//
// Doing it here (instead of in the controller) means we can NEVER
// forget to hash - signup, password reset, seeding the admin account,
// they all go through this same one place.
// ---------------------------------------------------------------------
userSchema.pre("save", async function (next) {
  // If the password wasn't changed in this save (e.g. we only updated
  // lastLoginAt), skip hashing - otherwise we'd hash the hash!
  if (!this.isModified("password")) {
    return next();
  }

  // A "salt" is random data mixed into the password before hashing, so
  // two people with the same password still get different hashes.
  // 10 is the standard "cost" - higher = slower = harder to crack.
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ---------------------------------------------------------------------
// A custom method we can call on any user document, like:
//   const isCorrect = await user.matchPassword("hunter2");
//
// bcrypt.compare() hashes the typed password the same way and checks if
// it matches the stored hash. We can never "un-hash" the stored one -
// that's the whole point of a one-way hash.
// ---------------------------------------------------------------------
userSchema.methods.matchPassword = async function (typedPassword) {
  return bcrypt.compare(typedPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
