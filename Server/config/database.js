const mongoose = require("mongoose");
const config = require("./config");

async function connectDB() {
  try {
    await mongoose.connect(config.MONGO_URI, { dbName: "chat" });
    console.log("DB connected");
  } catch (error) {
    throw new Error(`Database connection error: ${error.message}`);
  }
}

module.exports = connectDB;
