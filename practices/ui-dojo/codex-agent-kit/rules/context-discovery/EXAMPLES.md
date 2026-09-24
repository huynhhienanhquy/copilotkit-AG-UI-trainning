# Context Discovery Examples

Examples demonstrating thorough repository inspection, convention matching, and pre-edit verification.

---

## 1. Discovering Repository Tooling & Commands

### Good: Systematic Inspection Before Running Commands
1. **Check `package.json` / `pyproject.toml` / `Cargo.toml`**:
   - Inspect package scripts to identify build, test, lint, and typecheck commands:
     ```json
     "scripts": {
       "build": "vite build",
       "test:unit": "vitest run src/unit",
       "lint:check": "eslint . --max-warnings=0",
       "type-check": "tsc --noEmit"
     }
     ```
   - Run exact scripts discovered: `npm run test:unit`, `npm run type-check`.

2. **Check Lockfiles**:
   - `pnpm-lock.yaml` -> use `pnpm`
   - `yarn.lock` -> use `yarn`
   - `package-lock.json` -> use `npm`
   - `poetry.lock` -> use `poetry run ...`
   - `uv.lock` -> use `uv run ...`

### Bad: Blindly Guessing Package Managers and Test Commands
```bash
# Bad: Executing random commands without verifying project setup
yarn test # Fails if repo uses pnpm and has no yarn config
pytest    # Fails if virtual environment is located in .venv or repo uses poetry
```

---

## 2. Finding Existing Patterns Before Writing Code

### Good: Finding Established Codebase Patterns
```typescript
// Task: Implement a new API endpoint for fetching User Invoices.
// Step 1: Search repo for existing route patterns (e.g. `src/routes/userRoutes.ts` or `src/controllers/orderController.ts`).
// Step 2: Notice that the repo uses Zod for request validation, custom ApiError class, and async middleware wrapper:

import { Router } from "express";
import { validateBody } from "../middlewares/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { CreateInvoiceSchema } from "../schemas/invoiceSchemas";
import { invoiceController } from "../controllers/invoiceController";

export const invoiceRouter = Router();

invoiceRouter.post(
  "/invoices",
  validateBody(CreateInvoiceSchema),
  asyncHandler(invoiceController.createInvoice)
);
```

### Bad: Inventing a Contradictory Architecture
```typescript
// Bad: Using raw Joi or manual if/else checks when the entire rest of the codebase uses Zod,
// and creating custom try/catch instead of the established asyncHandler.
export function badInvoiceRoute(req: any, res: any) {
  try {
    if (!req.body.amount) return res.send("error");
    // ...
  } catch (e) {
    res.status(500).send(e.toString());
  }
}
```

---

## 3. Git Status & Uncommitted Changes Check

### Good: Checking Workspace State Prior to Modifications
```bash
git status
git diff --stat
```
- Verifies what unstaged or staged work already belongs to the user so agent changes do not overwrite or erase in-progress files.
