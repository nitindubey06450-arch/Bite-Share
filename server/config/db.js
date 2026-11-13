// server/config/db.js
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // Ignore if custom DNS cannot be set
}

const mongoose = require('mongoose');

// Disable query buffering so operations do not hang for 10s if DB is unreachable
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is missing in .env file!');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });

    console.log(`\x1b[32m✔ MongoDB Atlas Connected: ${conn.connection.host} [DB: ${conn.connection.name}]\x1b[0m`);
    return conn;
  } catch (error) {
    console.warn(`\x1b[33m⚠ MongoDB Notice: ${error.message}\x1b[0m`);
    if (error.message.includes('whitelist') || error.message.includes('Could not connect to any servers')) {
      console.warn(`\x1b[33m👉 Atlas IP Whitelist Action: Go to Atlas Dashboard -> Network Access -> Add '0.0.0.0/0'\x1b[0m`);
    }
  }
};

module.exports = connectDB;
