import express, { Express } from "express";
import config from "./config/env";
import { connectRedis, disconnectRedis } from "./config/redis";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { initializeTables } from "./config/initDatabase";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { corsMiddleware, devCorsMiddleware } from "./middleware/corsConfig";
import { specs, customSwaggerCSS } from "./config/swagger";
import swaggerUi from "swagger-ui-express";

import currencyRoutes from "./routes/currencyRoutes";
import { securityHeaders } from "./middleware/securityHeader";

const app: Express = express();

app.set("trust proxy", 1);

app.use(securityHeaders);

if (config.nodeEnv === "development") {
  app.use(devCorsMiddleware);
  console.log("CORS: Allowing all origins (development mode)");
} else {
  app.use(corsMiddleware);
  console.log("CORS: Whitelist enabled (production mode)");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: customSwaggerCSS,
    customSiteTitle: "Currency Converter API Documentation",
    swaggerOptions: {
      docExpansion: "list",
      filter: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  })
);
console.log("Swagger documentation available at /api-docs");

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Currency Converter API!",
    documentation: `${req.protocol}://${req.get("host")}/api-docs`,
  });
});

app.use("/api", currencyRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectRedis();
    await connectDatabase();
    await initializeTables();

    app.listen(config.port, () => {
      console.log(`                                                     
   Currency Converter Service                         
   Server: http://localhost:${config.port}                    
   Documentation: http://localhost:${config.port}/api-docs  
   Environment: ${config.nodeEnv}                   
`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

const shutdown = async () => {
  await disconnectRedis();
  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
