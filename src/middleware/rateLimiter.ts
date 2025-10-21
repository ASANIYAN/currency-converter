import rateLimit from "express-rate-limit";

// General API rate limiter - 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check api
  skip: (req) => req.path === "/api/health",
});

// Strict limiter for conversion endpoint - 30 requests per 15 minutes
export const conversionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 conversion requests per windowMs
  message: {
    error: "Too many conversion requests, please try again later",
    retryAfter: "15 minutes",
    hint: "Consider caching results on your end",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// strict limiter for testing/debugging endpoints
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: "Rate limit exceeded for this endpoint",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
