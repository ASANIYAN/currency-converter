import Joi from "joi";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: any;
    }
  }
}

// Schema for currency conversion request
export const convertSchema = Joi.object({
  from: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      "string.length": "Currency code must be exactly 3 characters",
      "string.pattern.base": "Currency code must contain only letters",
      "any.required": "Source currency (from) is required",
    }),
  to: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      "string.length": "Currency code must be exactly 3 characters",
      "string.pattern.base": "Currency code must contain only letters",
      "any.required": "Target currency (to) is required",
    }),
  amount: Joi.number().positive().max(1000000000).required().messages({
    "number.base": "Amount must be a number",
    "number.positive": "Amount must be positive",
    "number.max": "Amount cannot exceed 1 billion",
    "any.required": "Amount is required",
  }),
});

// Schema for getting exchange rate
export const rateSchema = Joi.object({
  from: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      "string.length": "Currency code must be exactly 3 characters",
      "string.pattern.base": "Currency code must contain only letters",
      "any.required": "Source currency (from) is required",
    }),
  to: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      "string.length": "Currency code must be exactly 3 characters",
      "string.pattern.base": "Currency code must contain only letters",
      "any.required": "Target currency (to) is required",
    }),
});

// Schema for rate history request
export const historySchema = Joi.object({
  from: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      "string.length": "Currency code must be exactly 3 characters",
      "string.pattern.base": "Currency code must contain only letters",
      "any.required": "Source currency (from) is required",
    }),
  to: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      "string.length": "Currency code must be exactly 3 characters",
      "string.pattern.base": "Currency code must contain only letters",
      "any.required": "Target currency (to) is required",
    }),
  hours: Joi.number()
    .integer()
    .min(1)
    .max(720) // Max 30 days
    .optional()
    .default(24)
    .messages({
      "number.base": "Hours must be a number",
      "number.integer": "Hours must be a whole number",
      "number.min": "Hours must be at least 1",
      "number.max": "Hours cannot exceed 720 (30 days)",
    }),
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Validate query parameters
    const { error, value } = schema.validate(req.query, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    // Add req.validatedQuery with validated and sanitized values
    req.validatedQuery = value;
    next();
  };
};
