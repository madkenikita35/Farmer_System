// models/ActivityLog.js
// -----------------------------------------------------------------------
// One row = one thing a user DID in the app.
//
// The admin dashboard needs to answer questions like "what have farmers
// been doing lately?". We could try to work that out by digging through
// receipts, logins, and searches separately... but it's far simpler to
// just write a small note every time something interesting happens, and
// then read those notes back in date order.
//
// That's all this file is: a diary of the app.
//
// HOW IT GETS WRITTEN
// Look at services/activityService.js - it has one tiny helper,
// logActivity(), that the controllers call. For example:
//
//   await logActivity(user, "UPLOAD_RECEIPT", "Uploaded a Wheat receipt");
//
// HOW IT GETS READ
// controllers/adminController.js reads this collection (newest first)
// to build the "Farmer Activity" feed on the admin dashboard.
// -----------------------------------------------------------------------

const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    // WHO did it. "ref: User" means this stores a User's _id, and lets
    // us later use .populate("user") to pull in that user's name/email
    // automatically - like a JOIN in SQL.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // We also copy the name/email/role in as plain text. Why duplicate
    // it? Because if a user is ever deleted, the activity feed would
    // otherwise show a blank row. This way old activity still reads
    // sensibly. (Storing a copy like this is called "denormalising".)
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    userRole: { type: String, default: "farmer" },

    // WHAT they did. Kept as a short, fixed code so we can count them
    // easily ("how many receipt uploads this week?"). The enum list
    // stops typos creeping in - add a new code here first if you want
    // to log a new kind of action.
    action: {
      type: String,
      enum: [
        "SIGNUP",
        "LOGIN",
        "LOGOUT",
        "UPLOAD_RECEIPT",
        "SCAN_RECEIPT",
        "CHECK_RATES",
        "SEARCH_MANDI",
        "VIEW_MANDI",
      ],
      required: true,
    },

    // A human-readable sentence describing it, shown directly in the
    // admin's activity table. e.g. "Checked rates for Onion in Maharashtra"
    description: {
      type: String,
      default: "",
    },

    // Anything extra worth keeping for that specific action, e.g.
    // { crop: "Wheat", pricePerQuintal: 2100 }. Using Mixed means "any
    // shape of object is fine here" - handy for a log like this where
    // each action type carries different details.
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // "createdAt" is the timestamp of the activity itself.
    timestamps: true,
  }
);

// An "index" makes reading the newest activity fast, even once there
// are thousands of rows. -1 means "descending" (newest first).
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
