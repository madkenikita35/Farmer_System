// routes/syncRoutes.js
// -----------------------------------------------------------------------
// GET /api/sync-status
//
// Tells the frontend when each price feed last gave us data, so every
// page can say "Data last updated: 19-09-2026 at 20:09" instead of
// leaving a farmer to wonder why this morning's number moved.
//
// PUBLIC on purpose: it sits on pages a guest can read, it contains no
// user data, and refusing it would just leave those pages with a blank
// label. See the note at the top of mandiRoutes.js.
// -----------------------------------------------------------------------

const express = require("express");
const router = express.Router();

const { getSyncStatus } = require("../services/syncStatusService");

router.get("/", async (req, res) => {
  try {
    const status = await getSyncStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error("Could not read sync status:", error.message);
    // A missing timestamp must never take a price page down with it, so
    // this answers 200 with nulls. The frontend shows nothing at all
    // when lastSyncedAt is null, which is the right outcome.
    res.status(200).json({ sources: {}, lastSyncedAt: null });
  }
});

module.exports = router;
