// middleware/upload.js
// -----------------------------------------------------------------------
// "Middleware" is code that runs IN BETWEEN a request coming in and our
// controller handling it. Here, we use the "multer" library to handle
// file uploads (the receipt/invoice image) and save them into the
// backend/uploads folder before our controller ever sees the request.
// -----------------------------------------------------------------------

const multer = require("multer");
const path = require("path");

// Tell multer WHERE to save files and WHAT to name them.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    // Prefix with a timestamp so two uploads never overwrite each other.
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Only accept image files (jpg, jpeg, png) - receipts are photos.
function fileFilter(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png/;
  const isAllowed = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .jpeg and .png image files are allowed"));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB per file
});

module.exports = upload;
