// config/db.js
// -----------------------------------------------------------------------
// This file's ONLY job is to connect our backend to MongoDB.
// We keep it separate so server.js stays clean and easy to read.
// -----------------------------------------------------------------------

const mongoose = require("mongoose");

async function connectDB() {
  try {
    // mongoose.connect() returns a Promise, so we "await" it.
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    // If MongoDB is not running / URI is wrong, we log it clearly
    // and stop the app, because nothing will work without a database.
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
