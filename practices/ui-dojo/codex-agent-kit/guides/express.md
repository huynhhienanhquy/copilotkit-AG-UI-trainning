# Express + TypeScript Guide

Override rules for Express.js backend projects.

## Package Manager

```bash
npm run dev           # development with hot reload
npm run build         # compile TypeScript
npm run start         # production server
npm run test          # test suite
npm run lint          # linting
npm run typecheck     # type checking
```

## Project Conventions

- Routes: `src/routes/` or `src/api/`
- Controllers: `src/controllers/`
- Services: `src/services/` (business logic)
- Middleware: `src/middleware/`
- Types: `src/types/`

## Express-Specific Rules

- Validate request body with Zod, Joi, or similar at the route boundary.
- Use middleware for cross-cutting concerns: auth, logging, error handling.
- Return consistent error shape: `{ error: string, code: string, requestId? }`.
- Use `express.json()` limit to prevent large payload attacks.
- Handle async errors with `express-async-errors` or wrapper function.
- Do not store secrets in code; use environment variables.

## Error Handling

```typescript
// Global error handler middleware
app.use((err, req, res, next) => {
  const requestId = req.headers['x-request-id'];
  console.error({ requestId, error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.isOperational ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    requestId,
  });
});
```

## Testing

```bash
npm run test -- --coverage   # with coverage
npm run test -- --watch       # watch mode
```

- Test routes with supertest.
- Mock external services (db, email, payment) at the boundary.
- Test error paths and validation failures.

## Build and Deploy

```bash
npm run build          # compile TypeScript
npm run start          # production server
```

- Verify `tsconfig.json` for strict mode and paths.
- Check Dockerfile or deployment config for production build.
