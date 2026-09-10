# Backend Engineering Examples

Examples demonstrating clean architectural separation, strict boundary validation, idempotent operations, and resilient integration patterns.

---

## 1. Architectural Layering (Transport vs Service vs Repository)

### Good: Clear Separation of Concerns
```typescript
// 1. Transport Layer (Controller)
// Validates HTTP input, delegates to service, maps domain errors to HTTP status
export async function createOrderHandler(req: Request, res: Response) {
  const parseResult = CreateOrderSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid order payload",
      details: parseResult.error.flatten(),
    });
  }

  const order = await orderService.createOrder(req.user.id, parseResult.data);
  return res.status(201).json({ data: order });
}

// 2. Service Layer (Business Logic)
// Enforces business rules and coordinates data access
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly inventoryService: InventoryService
  ) {}

  async createOrder(userId: string, data: CreateOrderDTO): Promise<Order> {
    const isAvailable = await this.inventoryService.checkStock(data.items);
    if (!isAvailable) {
      throw new OutOfStockError("One or more items are out of stock");
    }

    const order = await this.orderRepo.create({
      userId,
      items: data.items,
      status: "PENDING_PAYMENT",
    });

    return order;
  }
}

// 3. Repository Layer (Data Access)
// Handles database operations only
export class OrderRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(orderData: NewOrderRecord): Promise<Order> {
    return this.db.orders.insert(orderData);
  }
}
```

### Bad: Monolithic Fat Route Handler
```typescript
// Bad: Database queries, business calculations, HTTP responses mixed in one handler
app.post("/api/orders", async (req, res) => {
  const { items, cardToken } = req.body; // Unvalidated input!
  
  const rawDb = getDbConnection();
  const stock = await rawDb.query("SELECT * FROM inventory WHERE id = " + items[0].id); // SQL injection risk!
  
  if (stock.rows[0].qty < 1) {
    return res.status(500).send("No stock"); // Wrong HTTP status code
  }
  
  const paymentResult = await axios.post("https://payment.provider/charge", { cardToken }); // No timeout or error handling!
  
  const newOrder = await rawDb.query("INSERT INTO orders ... VALUES ...");
  res.json(newOrder);
});
```

---

## 2. Request Boundary Validation

### Good: Strict Schema Parsing at Boundary
```typescript
import { z } from "zod";

export const UpdateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(50).trim(),
  email: z.string().email().toLowerCase(),
  age: z.number().int().min(18).max(120).optional(),
  preferences: z.object({
    newsletter: z.boolean(),
    theme: z.enum(["light", "dark", "system"]),
  }).strict(),
}).strict(); // Reject unexpected properties
```

---

## 3. Idempotent Processing Pattern

### Good: Preventing Duplicate Executions
```typescript
export async function processPaymentWithIdempotency(
  idempotencyKey: string,
  paymentData: PaymentRequest
): Promise<PaymentResponse> {
  const existingRecord = await idempotencyStore.get(idempotencyKey);
  
  if (existingRecord) {
    if (existingRecord.status === "COMPLETED") {
      return existingRecord.response;
    }
    if (existingRecord.status === "IN_PROGRESS") {
      throw new ConflictError("Operation already in progress. Please wait.");
    }
  }

  // Acquire lock / mark IN_PROGRESS
  await idempotencyStore.set(idempotencyKey, { status: "IN_PROGRESS" }, { ttlSeconds: 60 });

  try {
    const result = await paymentClient.charge(paymentData);
    await idempotencyStore.set(idempotencyKey, { status: "COMPLETED", response: result });
    return result;
  } catch (error) {
    await idempotencyStore.delete(idempotencyKey);
    throw error;
  }
}
```

---

## 4. Resilient External Calls (Timeout, Exponential Backoff, Circuit Breaker)

### Good: Resilient External Call
```typescript
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number; timeoutMs: number }
): Promise<T> {
  let attempt = 0;

  while (attempt <= options.maxRetries) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);

      const result = await fn();
      clearTimeout(timer);
      return result;
    } catch (err: any) {
      attempt++;
      if (attempt > options.maxRetries || !isTransientError(err)) {
        throw err;
      }

      const delay = options.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Exhausted retries");
}
```
