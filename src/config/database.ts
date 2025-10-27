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
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on("connect", () => {});

  pool.on("error", (err) => {});

  try {
    const client = await pool.connect();
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
