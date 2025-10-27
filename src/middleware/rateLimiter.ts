import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again later",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
});

export const conversionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: "Too many conversion requests, please try again later",
    retryAfter: "15 minutes",
    hint: "Consider caching results on your end",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: "Rate limit exceeded for this endpoint",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
