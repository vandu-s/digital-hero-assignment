/**
 * Generic Zod-validation middleware. Pass it a schema shaped like
 * { body?, query?, params? } and it parses req against that shape.
 * Throws a ZodError on failure, which errorHandler turns into a 400
 * response - so routes never validate input themselves.
 *
 * The parsed, coerced query (e.g. page: "2" -> 2) is attached to
 * req.validatedQuery rather than reassigned onto req.query, because
 * Express 5's req.query is a read-only getter in the type defs.
 */
import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

export const validate =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.params) req.params = parsed.params;
    if (parsed.query) req.validatedQuery = parsed.query;

    next();
  };
