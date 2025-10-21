import swaggerJSDoc, { Options } from "swagger-jsdoc";
import path from "path";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import config from "./env";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Currency Converter API",
      version: "1.0.0",
      description:
        "A high-performance currency conversion service with real-time exchange rates, intelligent aggregation, and caching.",
      contact: {
        name: "API Support",
        email: "support@currencyconverter.example.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Development server",
      },
      {
        url: "https://currency-converter-e4i2.onrender.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ConversionResult: {
          type: "object",
          properties: {
            baseCurrency: { type: "string", example: "USD" },
            targetCurrency: { type: "string", example: "EUR" },
            amount: { type: "number", example: 100 },
            convertedAmount: { type: "number", example: 92.5 },
            rate: { type: "number", example: 0.925 },
            timestamp: { type: "string", format: "date-time" },
            source: {
              type: "string",
              example: "aggregate(fixer,openexchange)",
            },
            fromCache: { type: "boolean", example: true },
          },
        },
        RateHistory: {
          type: "object",
          properties: {
            currencyPair: { type: "string", example: "USD-EUR" },
            rates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rate: { type: "number", example: 0.925 },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        CurrencyPair: {
          type: "object",
          properties: {
            pair: { type: "string", example: "USD-EUR" },
            lastRate: { type: "number", example: 0.925 },
            lastUpdated: { type: "string", format: "date-time" },
          },
        },
        HealthCheck: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            status: { type: "string", example: "ok" },
            uptime: { type: "number", example: 3600 },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "ValidationError" },
            message: { type: "string", example: "Invalid input" },
            code: { type: "string", example: "INVALID_INPUT" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
      parameters: {
        FromCurrency: {
          name: "from",
          in: "query",
          required: true,
          schema: { type: "string", pattern: "^[A-Z]{3}$", example: "USD" },
          description: "Source currency code (ISO 4217)",
        },
        ToCurrency: {
          name: "to",
          in: "query",
          required: true,
          schema: { type: "string", pattern: "^[A-Z]{3}$", example: "EUR" },
          description: "Target currency code (ISO 4217)",
        },
        Amount: {
          name: "amount",
          in: "query",
          required: true,
          schema: { type: "number", minimum: 0.01, example: 100 },
          description: "Amount to convert",
        },
        Hours: {
          name: "hours",
          in: "query",
          required: true,
          schema: { type: "integer", minimum: 1, maximum: 168, example: 24 },
          description: "Hours of history to retrieve",
        },
      },
      responses: {
        BadRequest: {
          description: "Bad Request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        TooManyRequests: {
          description: "Too Many Requests",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ServerError: {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
    tags: [
      { name: "Conversion", description: "Currency conversion operations" },
      { name: "Rates", description: "Exchange rate endpoints" },
      { name: "History", description: "Historical rate data" },
      { name: "System", description: "Health and system endpoints" },
    ],
  },
  apis: [path.join(process.cwd(), "src/routes/*.ts")],
};

// Generate Swagger specification
export const specs = swaggerJSDoc(options);

// CSS used to style the Swagger UI to resemble the reference image
export const customSwaggerCSS = `
  /* Topbar styling - reduce spacing and make logo/text white */
  .swagger-ui .topbar { background: #0f1724; padding: 6px 12px; }
  .swagger-ui .topbar .topbar-wrapper, 
  .swagger-ui .topbar a, 
  .swagger-ui .topbar .topbar-wrapper .topbar-logo, 
  .swagger-ui .topbar .topbar-wrapper .topbar-logo * {
    color: #ffffff !important;
    fill: #ffffff !important;
  }
  .swagger-ui .topbar .topbar-wrapper .topbar-logo img { filter: none !important; opacity: 1 !important; }

  /* Reduce the vertical gap between topbar and page content */
  .swagger-ui .information-container, .swagger-ui .wrapper, .swagger-ui .info { margin-top: 8px !important; }

  /* Ensure API title still stands out; keep dark text for title area */
  .swagger-ui .info .title { color: #0f1724; font-weight: 700; }

  /* Tag and opblock tweaks to better match reference */
  .swagger-ui .opblock-tag { font-size: 1.25rem; color: #0f1724; border-bottom: 2px solid #10b981; }
  .swagger-ui .opblock { border-radius: 6px; margin-bottom: 0.75rem; }
  .swagger-ui .opblock-summary-method { min-width: 80px; font-weight: 700; }
  .swagger-ui .servers { margin: 0.75rem 0; }
  .swagger-ui .authorize-wrapper { margin-top: -10px; }
`;

// Legacy helper - still available if callers want to mount via function
export const setupSwagger = (app: Express): void => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: customSwaggerCSS,
    })
  );
};

export default specs;
