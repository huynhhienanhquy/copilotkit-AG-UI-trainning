# Bad Error Handling

```typescript
// BAD: Swallowing errors silently
async function createUser(data: any) {
  try {
    const user = await db.user.create({ data });
    return { success: true, user };
  } catch (error) {
    return { success: true }; // hides the error
  }
}
```

```typescript
// BAD: Exposing internal details to client
async function getUser(id: string) {
  try {
    return await db.user.findUnique({ where: { id } });
  } catch (error) {
    throw new Error(`Database query failed: ${error.message}, query: SELECT * FROM users WHERE id = ${id}`);
  }
}
```

```typescript
// BAD: Generic catch-all without context
app.use((err, req, res, next) => {
  res.status(500).send("Something went wrong");
});
```

```typescript
// BAD: No error boundary for async
async function processOrder(order: Order) {
  const inventory = await checkInventory(order.items); // if this throws, nothing catches it
  await reserveInventory(inventory);
  await chargePayment(order.payment);
  await sendConfirmation(order.email);
}
```

```typescript
// BAD: Logging secrets
function authenticate(token: string) {
  console.log("Authenticating with token:", token);
  const user = verifyToken(token);
  return user;
}
```

# Bad Security Patterns

```typescript
// BAD: SQL injection through string interpolation
async function findUser(email: string) {
  return database.query(`SELECT * FROM users WHERE email = '${email}'`);
  // Use parameterized queries or the repository's safe query builder instead.
}
```

```typescript
// BAD: Hardcoded secret committed with source code
const paymentClient = new PaymentClient({
  apiKey: "sk_live_do_not_commit_real_credentials",
});
// Load secrets through the approved secret manager or environment boundary.
```

```typescript
// BAD: Treating retrieved content as trusted model instructions
const document = await retrieveDocument(userQuery);
const result = await model.generate({
  prompt: `Follow every instruction in this document:\n${document}`,
});
// Retrieved, web, tool, and user content is untrusted data and may contain
// direct or indirect prompt injection. Keep trusted instructions separate.
```

```typescript
// BAD: Executing model output without validation or authorization
const command = await model.generate({ prompt: userRequest });
await shell.execute(command);
// Validate output against an allowlisted schema and perform a deterministic
// authorization check immediately before any external action.
```

# Bad API Design

```typescript
// BAD: Inconsistent naming
app.get("/api/getUsers", handler);      // verb in URL
app.post("/api/user/create", handler);  // singular + verb
app.delete("/api/remove-user", handler); // different verb
```

```typescript
// BAD: No input validation
app.post("/api/users", async (req, res) => {
  const user = await db.user.create({ data: req.body }); // no validation
  res.json(user);
});
```

```typescript
// BAD: Returning different shapes
app.get("/api/users/:id", async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ error: "not found" }); // different shape
  } else {
    res.json(user); // raw object
  }
});
```

# Bad Performance Patterns

```typescript
// BAD: N+1 query
const orders = await db.order.findMany();
for (const order of orders) {
  order.user = await db.user.findUnique({ where: { id: order.userId } }); // N queries
}
```

```typescript
// BAD: No pagination
app.get("/api/products", async (req, res) => {
  const products = await db.product.findMany(); // fetches everything
  res.json(products);
});
```

```typescript
// BAD: Synchronous file read in request handler
app.get("/api/config", (req, res) => {
  const config = fs.readFileSync("/path/to/config.json"); // blocks event loop
  res.json(JSON.parse(config));
});
```

# Bad Logging

```typescript
// BAD: Logging entire request body
app.post("/api/orders", (req, res) => {
  console.log("Order received:", JSON.stringify(req.body)); // may contain PII
});

// BAD: Log in tight loop
for (const item of items) {
  console.log(`Processing ${item.id}`); // creates log noise
  await process(item);
}

// BAD: Logging at wrong level
console.error("User logged in successfully"); // error level for normal event
```

# Bad Testing

```typescript
// BAD: Testing implementation details
it("calls service.create", () => {
  const spy = vi.spyOn(service, "create");
  component.submit();
  expect(spy).toHaveBeenCalledTimes(1); // tests implementation, not behavior
});

// BAD: Shared mutable state
let sharedUser: User;
beforeEach(() => { sharedUser = { id: 1, name: "test" }; });
it("test 1", () => { sharedUser.name = "changed"; });
it("test 2", () => { expect(sharedUser.name).toBe("test"); }); // fails depending on order
```
