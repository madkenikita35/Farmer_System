// services/activityService.js
// -----------------------------------------------------------------------
// One tiny helper whose only job is to write a row into the ActivityLog
// collection (see models/ActivityLog.js).
//
// WHY A WHOLE FILE FOR ONE FUNCTION?
// Because it's called from LOTS of places (auth, receipts, mandi
// lookups). If the logging rules ever change - say you want to also
// write to a file, or stop logging searches - you change it HERE, once,
// instead of hunting through every controller.
//
// IMPORTANT DESIGN CHOICE: logging must NEVER break the real feature.
// If writing the log fails (database hiccup, bad data, whatever), we
// just print a warning and carry on. A farmer's receipt upload should
// not fail simply because we couldn't write a diary entry about it.
// That's why everything below is wrapped in try/catch.
// -----------------------------------------------------------------------

const ActivityLog = require("../models/ActivityLog");

/**
 * Records one thing a user did.
 *
 * @param {object} user - the logged-in user document (from req.user).
 *                        If this is null/undefined we skip logging,
 *                        because an activity with no owner is useless.
 * @param {string} action - one of the codes listed in ActivityLog's
 *                          `action` enum, e.g. "UPLOAD_RECEIPT".
 * @param {string} description - a readable sentence for the admin table.
 * @param {object} [details] - optional extra data, e.g. { crop: "Wheat" }.
 */
async function logActivity(user, action, description, details = {}) {
  try {
    if (!user) return; // nothing sensible to log against

    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      description,
      details,
    });
  } catch (error) {
    // Deliberately swallowed - see the note at the top of this file.
    console.warn("⚠️  Could not write activity log:", error.message);
  }
}

module.exports = { logActivity };
