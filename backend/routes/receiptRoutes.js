// routes/receiptRoutes.js
// -----------------------------------------------------------------------
// Routes just MAP a URL + HTTP method to a controller function.
// No real logic lives here on purpose - that keeps things easy to scan.
// -----------------------------------------------------------------------

const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");
const {
  scanReceipt,
  createReceipt,
  getReceipts,
  getDashboardStats,
  getReceiptImage,
} = require("../controllers/receiptController");

// 🔒 Every receipt route needs a logged-in user. Uploading a receipt
// now stamps it with WHO uploaded it (req.user), which is what makes
// "a farmer sees only their own receipts" possible.
router.use(protect);

// POST /api/receipts/scan
// Upload an image, run OCR on it, get back guessed field values.
// "upload.single('receiptImage')" means: expect ONE file, sent under
// the form-field name "receiptImage".
router.post("/scan", upload.single("receiptImage"), scanReceipt);

// POST /api/receipts
// Save the final, user-confirmed receipt (after comparing with market).
router.post("/", createReceipt);

// GET /api/receipts
// List all saved receipts (newest first).
router.get("/", getReceipts);

// GET /api/receipts/image/:filename
// An uploaded receipt photo. Only the farmer who uploaded it (or an
// admin) can fetch it - see getReceiptImage() for why this replaced the
// old public /uploads folder.
router.get("/image/:filename", getReceiptImage);

// GET /api/receipts/dashboard-stats
// Get summary numbers + chart-ready data for the dashboard page.
router.get("/dashboard-stats", getDashboardStats);

module.exports = router;
