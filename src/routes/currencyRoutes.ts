import { Router, Request, Response } from "express";
import { rateAggregatorService } from "../services/rateAggregatorService";
import {
  validate,
  convertSchema,
  rateSchema,
  historySchema,
} from "../middleware/validation";
import { asyncHandler } from "../middleware/errorHandler";
import { databaseService } from "../services/databaseServices";
import { conversionLimiter } from "../middleware/rateLimiter";

const router = Router();

/**
 * @swagger
 * /api/convert:
 *   get:
 *     summary: Convert an amount from one currency to another
 *     description: Converts a specified amount from one currency to another using the latest exchange rates
 *     tags: [Conversion]
 *     parameters:
 *       - $ref: '#/components/parameters/FromCurrency'
 *       - $ref: '#/components/parameters/ToCurrency'
 *       - $ref: '#/components/parameters/Amount'
 *     responses:
 *       200:
 *         description: Conversion performed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversionResult'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  "/convert",
  conversionLimiter,
  validate(convertSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to, amount } = req.validatedQuery;

    const result = await rateAggregatorService.convertCurrency(
      from as string,
      to as string,
      parseFloat(amount as string)
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @swagger
 * /api/rates:
 *   get:
 *     summary: Get current exchange rate
 *     description: Retrieves the current exchange rate between two currencies
 *     tags: [Rates]
 *     parameters:
 *       - $ref: '#/components/parameters/FromCurrency'
 *       - $ref: '#/components/parameters/ToCurrency'
 *     responses:
 *       200:
 *         description: Exchange rate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     baseCurrency:
 *                       type: string
 *                       example: "USD"
 *                     targetCurrency:
 *                       type: string
 *                       example: "EUR"
 *                     rate:
 *                       type: number
 *                       example: 0.925
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     source:
 *                       type: string
 *                       example: "fixer"
 *                     fromCache:
 *                       type: boolean
 *                       example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  "/rates",
  validate(rateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.validatedQuery;

    const result = await rateAggregatorService.getExchangeRate(
      from as string,
      to as string
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get historical exchange rates
 *     description: Retrieves historical exchange rate data for a currency pair over a specified time period
 *     tags: [History]
 *     parameters:
 *       - $ref: '#/components/parameters/FromCurrency'
 *       - $ref: '#/components/parameters/ToCurrency'
 *       - $ref: '#/components/parameters/Hours'
 *     responses:
 *       200:
 *         description: Historical data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RateHistory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  "/history",
  validate(historySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to, hours } = req.validatedQuery;

    const result = await rateAggregatorService.getRateHistory(
      from as string,
      to as string,
      parseInt(hours as string, 10)
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: List all supported currency pairs
 *     description: Returns a list of all supported currency pairs with their latest exchange rates
 *     tags: [Rates]
 *     responses:
 *       200:
 *         description: Currency pairs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 25
 *                   description: Number of currency pairs returned
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CurrencyPair'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  "/currencies",
  asyncHandler(async (req: Request, res: Response) => {
    const pairs = await databaseService.getAllCurrencyPairs();

    res.json({
      success: true,
      count: pairs.length,
      data: pairs,
    });
  })
);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Verifies the API is operational and returns basic system status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
