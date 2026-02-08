import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "gatherly",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// Test connection on startup
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Helper function to run queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("Executed query", {
    text: text.substring(0, 50),
    duration,
    rows: result.rowCount,
  });
  return result;
};

// Helper function to get a client for transactions
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export default pool;
