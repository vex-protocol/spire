import type { NextFunction, Request, Response } from "express";
import type { z } from "zod/v4";

/**
 * Express middleware that validates req.body against a Zod schema.
 * On failure, returns 400 with validation errors.
 */
export function validateBody<T extends z.ZodType>(schema: T) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: "Validation failed",
                issues: result.error.issues,
            });
            return;
        }
        req.body = result.data;
        next();
    };
}

/**
 * Validates a single URL param as a non-empty string.
 * For UUIDs, use validateUuidParam.
 */
export function validateParam(name: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const value = req.params[name];
        if (!value || typeof value !== "string" || value.trim() === "") {
            res.status(400).json({ error: `Missing or empty parameter: ${name}` });
            return;
        }
        next();
    };
}
