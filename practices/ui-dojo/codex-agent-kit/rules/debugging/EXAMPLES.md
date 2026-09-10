# Debugging and Error Investigation Examples

Examples demonstrating empirical, evidence-based root cause investigation versus superficial symptom patching.

---

## 1. Inspecting Full Traceback vs Guessing

### Good: Evidence-Driven Root Cause Investigation
```text
Scenario:
Unit test fails with:
TypeError: Cannot read properties of undefined (reading 'split')
    at formatUsername (src/utils/formatters.ts:18:23)
    at renderUserProfile (src/components/UserProfile.tsx:45:12)
    at src/components/__tests__/UserProfile.test.tsx:32:9

Investigation:
1. Inspect formatters.ts:18:
   `export function formatUsername(user: { email: string }) { return user.email.split('@')[0]; }`
2. Trace upstream caller in UserProfile.tsx:45:
   `const name = formatUsername(user);` where `user` object can have optional email (`email?: string`).
3. Root Cause: User entity contract allows email to be null/undefined for OAuth users without email scope.
4. Fix: Handle optional email in contract and formatters with a fallback username or displayName.
```

### Bad: Superficial Guessing or Ignoring Traceback
```typescript
// Bad: Swallowing error blindly with empty try/catch or dummy return
export function formatUsername(user: any) {
  try {
    return user.email.split('@')[0];
  } catch (e) {
    return ""; // Masks missing data bug, hides broken user profile rendering
  }
}
```

---

## 2. Fixing Root Cause Upstream vs Patching Symptoms Downstream

### Good: Tracing and Fixing the Upstream Source
```typescript
// Root cause: The backend API endpoint `/api/user` was returning `created_at` in snake_case,
// but the TypeScript interface expected camelCase `createdAt`.

// Good Fix: Update API serializer to properly map snake_case to camelCase at the API client boundary:
export function mapUserResponse(raw: RawUserApiResponse): User {
  return {
    id: raw.id,
    createdAt: new Date(raw.created_at),
    displayName: raw.display_name,
  };
}
```

### Bad: Patching Every Downstream Component with Optional Chaining
```typescript
// Bad: Adding `user?.createdAt?.toString?.() || ""` in 20 different components without fixing the API client
const formattedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A";
```

---

## 3. Targeted Diagnostic Logging

### Good: Structured Probes to Isolate Intermittent Bugs
```typescript
export async function fetchAccountBalance(accountId: string): Promise<number> {
  logger.debug("Attempting balance lookup", {
    accountId,
    timestamp: new Date().toISOString(),
  });

  const response = await apiClient.get(`/accounts/${accountId}/balance`);

  if (typeof response.data?.balance !== "number") {
    logger.error("Unexpected balance payload structure from core banking API", {
      accountId,
      receivedPayload: response.data,
      status: response.status,
    });
    throw new InvalidApiResponseError("Banking API returned non-numeric balance");
  }

  return response.data.balance;
}
```

### Bad: Commenting Out Broken Assertions to "Fix" Tests
```typescript
// Bad: Never delete failing assertions just to make test suites green!
it("should calculate correct sales tax", () => {
  const result = calculateTax(100, "CA");
  // expect(result).toBe(8.25); // Disabled because it failed! -> NEVER DO THIS
});
```
