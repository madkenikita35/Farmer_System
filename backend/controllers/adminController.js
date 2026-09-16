// controllers/adminController.js
// -----------------------------------------------------------------------
// Everything only an ADMIN is allowed to see or do.
//
// SECURITY: none of these functions check the role themselves. That's
// handled once, in routes/adminRoutes.js, where every route is wrapped
// in `protect, adminOnly` (see middleware/auth.js). Doing it in the
// route file means you can glance at that one small file and confirm
// nothing was left unguarded - much safer than hoping every function
// below remembered to check.
//
// What's in here:
//   1. getAdminStats     -> the big summary numbers + charts
//   2. getAllFarmers     -> the list of enrolled farmers (searchable)
//   3. getFarmerDetail   -> one farmer: their receipts + their activity
//   4. getActivityFeed   -> "what has everyone been doing?"
//   5. toggleFarmerActive -> deactivate/reactivate a farmer's login
// -----------------------------------------------------------------------

const mongoose = require("mongoose");

const User = require("../models/User");
const Receipt = require("../models/Receipt");
const ActivityLog = require("../models/ActivityLog");

// ---------------------------------------------------------------------
// GET /api/admin/stats
// The numbers the admin dashboard's cards and charts are built from.
// ---------------------------------------------------------------------
async function getAdminStats(req, res) {
  try {
    // --- Work out some useful cut-off dates up front ---
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // --- Run all the counting queries at the same time ---
    // Promise.all() fires them off together instead of waiting for each
    // one in turn. With this many queries that's a big speed difference.
    const [
      totalFarmers,
      activeFarmers,
      newFarmersThisWeek,
      newFarmersToday,
      totalReceipts,
      receiptsThisWeek,
      allReceipts,
      recentActivity,
      activeUserIdsLast30Days,
    ] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "farmer", isActive: true }),
      User.countDocuments({ role: "farmer", createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ role: "farmer", createdAt: { $gte: startOfToday } }),
      Receipt.countDocuments(),
      Receipt.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Receipt.find().sort({ createdAt: -1 }),
      ActivityLog.find().sort({ createdAt: -1 }).limit(10),
      // "distinct" returns the unique user ids that appear in the log -
      // i.e. how many different people actually DID something recently,
      // which is a more honest "active users" number than just counting
      // everyone who ever signed up.
      ActivityLog.distinct("user", { createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    // --- Verdict breakdown across every receipt in the system ---
    const underpaidCount = allReceipts.filter((r) => r.verdict === "Underpaid").length;
    const fairCount = allReceipts.filter((r) => r.verdict === "Fair Price").length;
    const overpaidCount = allReceipts.filter((r) => r.verdict === "Overpaid").length;

    // --- How much money did underpaid farmers collectively lose? ---
    const totalPotentialLoss = allReceipts
      .filter((r) => r.verdict === "Underpaid")
      .reduce(
        (sum, r) => sum + Math.abs(r.priceDifference || 0) * (r.quantityInQuintal || 0),
        0
      );

    // --- Signups per day for the last 14 days (line chart) ---
    // We build an empty row for EVERY day first, then fill in the
    // counts. Without that, days with zero signups would be missing
    // entirely and the chart would look wrong.
    const signupsByDay = [];
    for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
      const day = new Date(now);
      day.setDate(day.getDate() - daysAgo);
      const dayKey = day.toISOString().slice(0, 10); // "YYYY-MM-DD"
      signupsByDay.push({ date: dayKey, signups: 0, receipts: 0 });
    }

    const farmersLast14Days = await User.find({
      role: "farmer",
      createdAt: { $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
    });

    for (const farmer of farmersLast14Days) {
      const dayKey = farmer.createdAt.toISOString().slice(0, 10);
      const row = signupsByDay.find((d) => d.date === dayKey);
      if (row) row.signups += 1;
    }

    for (const receipt of allReceipts) {
      const dayKey = receipt.createdAt.toISOString().slice(0, 10);
      const row = signupsByDay.find((d) => d.date === dayKey);
      if (row) row.receipts += 1;
    }

    // --- Which crops are farmers uploading most? (top 8, bar chart) ---
    const cropCounts = {};
    for (const r of allReceipts) {
      cropCounts[r.crop] = (cropCounts[r.crop] || 0) + 1;
    }
    const topCrops = Object.entries(cropCounts)
      .map(([crop, count]) => ({ crop, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // --- Which mandis appear most in receipts? (top 8) ---
    const mandiCounts = {};
    for (const r of allReceipts) {
      const key = r.mandiName || "Unknown Mandi";
      mandiCounts[key] = (mandiCounts[key] || 0) + 1;
    }
    const topMandis = Object.entries(mandiCounts)
      .map(([mandi, count]) => ({ mandi, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // --- How many farmers signed up per state? ---
    const stateCounts = {};
    const allFarmers = await User.find({ role: "farmer" }).select("state");
    for (const f of allFarmers) {
      const key = f.state || "Not specified";
      stateCounts[key] = (stateCounts[key] || 0) + 1;
    }
    const farmersByState = Object.entries(stateCounts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      // Headline cards
      totalFarmers,
      activeFarmers,
      inactiveFarmers: totalFarmers - activeFarmers,
      newFarmersToday,
      newFarmersThisWeek,
      activeUsersLast30Days: activeUserIdsLast30Days.length,
      totalReceipts,
      receiptsThisWeek,
      totalPotentialLoss: Math.round(totalPotentialLoss),

      // Verdict split across the whole platform
      underpaidCount,
      fairCount,
      overpaidCount,
      verdictBreakdown: [
        { name: "Fair Price", value: fairCount },
        { name: "Underpaid", value: underpaidCount },
        { name: "Overpaid", value: overpaidCount },
      ],

      // Chart-ready arrays
      signupsByDay,
      topCrops,
      topMandis,
      farmersByState,

      // A short "latest activity" preview for the dashboard page
      recentActivity,
    });
  } catch (error) {
    console.error("Error building admin stats:", error);
    res.status(500).json({ message: "Failed to build admin statistics." });
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/farmers?search=ram&page=1&limit=20
// The enrolled-farmers table. Supports searching by name/email/state
// and is paginated so the page stays fast once there are thousands.
// ---------------------------------------------------------------------
async function getAllFarmers(req, res) {
  try {
    const { search = "", state = "", page = 1, limit = 20 } = req.query;

    // Start with "only farmers" - we never list admins here.
    const query = { role: "farmer" };

    if (state) {
      query.state = new RegExp(`^${escapeRegex(state)}$`, "i");
    }

    if (search) {
      // "$or" = match if ANY of these conditions is true.
      const needle = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: needle }, { email: needle }, { state: needle }, { phone: needle }];
    }

    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(100, Math.max(1, Number(limit))); // cap at 100
    const skip = (pageNumber - 1) * pageSize;

    const [farmers, totalMatching] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      User.countDocuments(query),
    ]);

    // For each farmer, also count how many receipts they've uploaded.
    // We do this with one query per farmer, which is fine for a page of
    // 20. (If this list ever got huge, the faster way would be a single
    // aggregate() with $group - a good thing to try later.)
    const farmersWithCounts = await Promise.all(
      farmers.map(async (farmer) => {
        const [receiptCount, lastReceipt, activityCount] = await Promise.all([
          Receipt.countDocuments({ uploadedBy: farmer._id }),
          Receipt.findOne({ uploadedBy: farmer._id }).sort({ createdAt: -1 }),
          ActivityLog.countDocuments({ user: farmer._id }),
        ]);

        return {
          id: farmer._id,
          name: farmer.name,
          email: farmer.email,
          phone: farmer.phone,
          state: farmer.state,
          isActive: farmer.isActive,
          enrolledOn: farmer.createdAt,
          lastLoginAt: farmer.lastLoginAt,
          receiptCount,
          activityCount,
          lastUploadDate: lastReceipt ? lastReceipt.createdAt : null,
        };
      })
    );

    res.status(200).json({
      farmers: farmersWithCounts,
      totalMatching,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(totalMatching / pageSize),
    });
  } catch (error) {
    console.error("Error fetching farmers:", error);
    res.status(500).json({ message: "Failed to fetch the farmer list." });
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/farmers/:id
// Everything about ONE farmer - opened when the admin clicks a row.
// ---------------------------------------------------------------------
async function getFarmerDetail(req, res) {
  try {
    // A malformed id made Mongoose throw a CastError, which became a
    // generic 500. Checking first gives an honest 404 and keeps error
    // logs meaningful.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "No farmer found with that id." });
    }

    const farmer = await User.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({ message: "No farmer found with that id." });
    }

    const [receipts, activity] = await Promise.all([
      Receipt.find({ uploadedBy: farmer._id }).sort({ createdAt: -1 }),
      ActivityLog.find({ user: farmer._id }).sort({ createdAt: -1 }).limit(50),
    ]);

    res.status(200).json({
      farmer: {
        id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        phone: farmer.phone,
        state: farmer.state,
        role: farmer.role,
        isActive: farmer.isActive,
        enrolledOn: farmer.createdAt,
        lastLoginAt: farmer.lastLoginAt,
      },
      receipts,
      activity,
      receiptCount: receipts.length,
    });
  } catch (error) {
    console.error("Error fetching farmer detail:", error);
    res.status(500).json({ message: "Failed to fetch that farmer's details." });
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/activity?action=LOGIN&page=1&limit=30
// The full "what have farmers been doing?" feed, newest first.
// ---------------------------------------------------------------------
async function getActivityFeed(req, res) {
  try {
    const { action = "", search = "", page = 1, limit = 30 } = req.query;

    const query = {};
    if (action) query.action = action;
    if (search) {
      const needle = new RegExp(escapeRegex(search), "i");
      query.$or = [{ userName: needle }, { userEmail: needle }, { description: needle }];
    }

    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * pageSize;

    const [activity, totalMatching] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      ActivityLog.countDocuments(query),
    ]);

    // A count per action type, for the small summary chips above the
    // table ("142 logins, 38 uploads, ...").
    const actionCounts = await ActivityLog.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      activity,
      totalMatching,
      page: pageNumber,
      totalPages: Math.ceil(totalMatching / pageSize),
      actionCounts: actionCounts.map((a) => ({ action: a._id, count: a.count })),
    });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    res.status(500).json({ message: "Failed to fetch the activity feed." });
  }
}

// ---------------------------------------------------------------------
// PATCH /api/admin/farmers/:id/toggle-active
// Turns a farmer's login on or off. We deactivate rather than delete so
// their uploaded receipts (which other farmers' comparisons rely on)
// stay in the community data pool.
// ---------------------------------------------------------------------
async function toggleFarmerActive(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "No farmer found with that id." });
    }

    const farmer = await User.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({ message: "No farmer found with that id." });
    }

    // Safety rail: don't let an admin lock out another admin (or
    // themselves) through this farmer-management screen.
    if (farmer.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be deactivated here." });
    }

    farmer.isActive = !farmer.isActive;
    await farmer.save();

    res.status(200).json({
      message: farmer.isActive ? "Farmer reactivated." : "Farmer deactivated.",
      isActive: farmer.isActive,
    });
  } catch (error) {
    console.error("Error toggling farmer status:", error);
    res.status(500).json({ message: "Failed to update that farmer." });
  }
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  getAdminStats,
  getAllFarmers,
  getFarmerDetail,
  getActivityFeed,
  toggleFarmerActive,
};
