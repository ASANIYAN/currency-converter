import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  redis: {
    host: string;
    port: number;
  };
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  apiKeys: {
    fixer: string;
    openExchange: string;
    currencyApi: string;
  };
  cache: {
    ttlSeconds: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  postgres: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    database: process.env.POSTGRES_DB || "currency_converter",
    user: process.env.POSTGRES_USER || "",
    password: process.env.POSTGRES_PASSWORD || "",
  },
  apiKeys: {
    fixer: process.env.FIXER_API_KEY || "",
    openExchange: process.env.OPENEXCHANGE_API_KEY || "",
    currencyApi: process.env.CURRENCYAPI_KEY || "",
  },
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "300", 10),
  },
};

export default config;
