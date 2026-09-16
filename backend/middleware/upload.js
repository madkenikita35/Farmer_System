// middleware/upload.js
// -----------------------------------------------------------------------
// "Middleware" is code that runs IN BETWEEN a request coming in and our
// controller handling it. Here, we use the "multer" library to handle
// file uploads (the receipt/invoice image) and save them into the
// backend/uploads folder before our controller ever sees the request.
// -----------------------------------------------------------------------

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// The only file types a receipt can be. Used by both the filter and the
// filename builder, so the two can never disagree.
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

// Tell multer WHERE to save files and WHAT to name them.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    // SECURITY: the filename is built here, NOT taken from the upload.
    //
    // It used to be `${Date.now()}-${file.originalname}`, which put an
    // attacker-controlled string straight into a filesystem path. Two
    // problems with that:
    //   1. path traversal - a name like "../../server.js" tries to
    //      escape the uploads folder. (Multer's parser happens to strip
    //      path separators, so this wasn't exploitable in practice, but
    //      relying on a library's incidental behaviour for that is not a
    //      control.)
    //   2. the resulting names were guessable, which matters when the
    //      files are private receipts.
    //
    // A random name solves both. We keep only the extension, and only
    // after checking it against a fixed list.
    const extension = path.extname(file.originalname).toLowerCase();
    const safeExtension = ALLOWED_EXTENSIONS.includes(extension) ? extension : ".jpg";

    // 16 random bytes = 32 hex characters. Not feasible to guess.
    const randomName = crypto.randomBytes(16).toString("hex");

    cb(null, `${Date.now()}-${randomName}${safeExtension}`);
  },
});

// Only accept image files (jpg, jpeg, png) - receipts are photos.
//
// We check BOTH the extension and the declared MIME type. Checking only
// the extension, as this used to, lets someone upload any content at all
// simply by naming it "x.png".
//
// Neither check is proof on its own - a client can claim any MIME type -
// so the real guarantee comes later: validateImage() in
// services/ocrService.js actually decodes the file and rejects anything
// that isn't a genuine raster image.
function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const extensionOk = ALLOWED_EXTENSIONS.includes(extension);
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (extensionOk && mimeOk) {
    return cb(null, true);
  }
  cb(new Error("Only .jpg, .jpeg and .png image files are allowed"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // max 5 MB per file
    files: 1, // one receipt per request - stops a flood of files in one POST
  },
});

module.exports = upload;
