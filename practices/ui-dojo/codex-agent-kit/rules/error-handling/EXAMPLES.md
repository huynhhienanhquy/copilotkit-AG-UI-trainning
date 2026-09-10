# Error Handling Examples

Examples demonstrating structured error hierarchies, clean API error responses, and safe error propagation.

---

## 1. Domain Error Hierarchy & Standard Error Shapes

### Good: Custom Domain Errors and Consistent Error Payload
```typescript
// Domain Error Base Class
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = "RESOURCE_NOT_FOUND";
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = "VALIDATION_FAILED";
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = "UNAUTHORIZED";
}

// Consistent Error Response Interface
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  requestId?: string;
}
```

---

## 2. Express / HTTP Error Middleware

### Good: Mapping Errors at Boundary without Leaking Internals
```typescript
import { Request, Response, NextFunction } from "express";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers["x-request-id"] as string || crypto.randomUUID();

  if (err instanceof AppError) {
    // Expected domain errors: return structured response
    logger.warn(`Handled application error: ${err.message}`, {
      errorCode: err.errorCode,
      requestId,
      details: err.details,
    });

    return res.status(err.statusCode).json({
      code: err.errorCode,
      message: err.message,
      details: err.details,
      requestId,
    });
  }

  // Unexpected internal errors (e.g. Database connection failure)
  // Log full error stack internally, return safe generic message to client
  logger.error("Unhandled internal server error", {
    error: err.message,
    stack: err.stack,
    requestId,
    url: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred. Please contact support with the requestId.",
    requestId,
  });
}
```

### Bad: Exposing Raw Stack Traces and DB Errors
```typescript
// Bad: Leaking sensitive server paths, database credentials, and SQL syntax to attackers
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.toString(),
    stack: err.stack, // DANGEROUS: Leaks internal paths and file structure
    dbQuery: err.query, // DANGEROUS: Leaks table names and SQL structure
  });
});
```

---

## 3. Async Flows & Promise Error Propagation

### Good: Clean Async Catch & Forwarding
```typescript
export const getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await orderService.findByUserId(req.params.userId);
    res.json({ data: orders });
  } catch (error) {
    next(error); // Properly forward to global error middleware
  }
};
```

### Bad: Swallowing Promise Rejections
```typescript
export const getUserOrders = async (req: Request, res: Response) => {
  orderService.findByUserId(req.params.userId)
    .then(orders => res.json({ data: orders }));
  // Missing .catch() -> causes unhandled promise rejection if query fails
};
```
