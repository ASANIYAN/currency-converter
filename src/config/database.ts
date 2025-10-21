import { Pool, PoolClient, QueryResult } from "pg";
import config from "./env";

let pool: Pool | null = null;

export const connectDatabase = async (): Promise<Pool> => {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if can't connect
    // ssl: {
    //   rejectUnauthorized: false, // Required for Neon
    // },
  });

  pool.on("connect", () => {
    // PostgreSQL client connected
  });

  pool.on("error", (err) => {
    // PostgreSQL pool error
  });

  // Test the connection
  try {
    const client = await pool.connect();
    // PostgreSQL connected successfully
    client.release();
  } catch (error) {
    throw error;
  }

  return pool;
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error(
      "Database pool not initialized. Call connectDatabase() first."
    );
  }
  return pool;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

// Helper function for executing queries
export const query = async (
  text: string,
  params?: any[]
): Promise<QueryResult> => {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
};
