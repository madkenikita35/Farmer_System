// routes/adminRoutes.js
// -----------------------------------------------------------------------
// Every admin-only URL lives here.
//
// THE IMPORTANT LINE IN THIS FILE IS THIS ONE:
//
//     router.use(protect, adminOnly);
//
// `router.use(...)` applies middleware to EVERY route defined below it
// in this file. So instead of repeating `protect, adminOnly` on each
// individual route (and risking forgetting it on one), we say it once
// at the top and it covers everything.
//
// This is why a farmer typing http://localhost:5173/admin into their
// browser still sees nothing useful: the page might load, but every API
// call it makes gets a 403 back from here.
// -----------------------------------------------------------------------

const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/auth");
const {
  getAdminStats,
  getAllFarmers,
  getFarmerDetail,
  getActivityFeed,
  toggleFarmerActive,
} = require("../controllers/adminController");

// 🔒 THE GUARD. Applies to every route below this line.
//    protect   -> must be logged in
//    adminOnly -> must have role === "admin"
router.use(protect, adminOnly);

// GET /api/admin/stats - summary numbers + chart data for the dashboard
router.get("/stats", getAdminStats);

// GET /api/admin/farmers - searchable, paginated list of enrolled farmers
router.get("/farmers", getAllFarmers);

// GET /api/admin/farmers/:id - one farmer's full profile + their activity
router.get("/farmers/:id", getFarmerDetail);

// PATCH /api/admin/farmers/:id/toggle-active - block/unblock a farmer
router.patch("/farmers/:id/toggle-active", toggleFarmerActive);

// GET /api/admin/activity - the full farmer activity feed
router.get("/activity", getActivityFeed);

module.exports = router;
