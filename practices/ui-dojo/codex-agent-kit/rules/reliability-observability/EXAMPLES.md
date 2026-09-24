# Reliability and Observability Examples

Examples demonstrating resilient HTTP clients, structured logging with correlation IDs, resource bounding, and health checks.

---

## 1. Resilient Outbound HTTP Client

### Good: Timeout, Jittered Backoff, and Circuit Breaker
```typescript
interface RequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

export async function fetchWithResilience(url: string, options: RequestOptions = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        return await response.json();
      }

      // Retry only on transient server errors (502, 503, 504, 429)
      if (![429, 502, 503, 504].includes(response.status) || attempt === maxRetries) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt === maxRetries || err.name === "AbortError") {
        throw err;
      }
    }

    // Exponential backoff with full jitter to avoid thundering herds
    const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
    const jitter = Math.random() * backoff;
    await new Promise((resolve) => setTimeout(resolve, jitter));
  }
}
```

---

## 2. Structured Logging with Correlation IDs

### Good: Contextual JSON Logs without PII
```typescript
export function logOperationEvent(
  logger: StructuredLogger,
  level: "info" | "warn" | "error",
  message: string,
  context: {
    requestId: string;
    userId: string;
    action: string;
    durationMs?: number;
    error?: Error;
  }
) {
  logger[level]({
    timestamp: new Date().toISOString(),
    level,
    message,
    correlation: {
      requestId: context.requestId,
      userId: sanitizeUserId(context.userId),
    },
    action: context.action,
    durationMs: context.durationMs,
    ...(context.error && {
      error: {
        name: context.error.name,
        message: context.error.message,
        stack: process.env.NODE_ENV !== "production" ? context.error.stack : undefined,
      },
    }),
  });
}
```

---

## 3. Resource Bounding (Streams & Concurrency Limits)

### Good: Processing Large Files via Streams
```typescript
import { createReadStream } from "fs";
import readline from "readline";

export async function countLargeLogLines(filePath: string): Promise<number> {
  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  for await (const _line of rl) {
    lineCount++;
  }
  return lineCount;
}
```

### Bad: Unbounded Memory Consumption
```typescript
// Bad: Loading a 10GB file completely into memory will crash Node.js with Out-of-Memory (OOM)
const entireFile = fs.readFileSync(largeFilePath, "utf-8");
```
