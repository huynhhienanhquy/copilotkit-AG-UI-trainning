# Code Quality Examples

Examples demonstrating readable, maintainable, single-responsibility code and clean abstractions versus anti-patterns.

---

## 1. Single Responsibility & Function Size

### Good: Small, Cohesive Functions
```typescript
interface UserData {
  id: string;
  email: string;
  age: number;
}

export function validateUserData(user: UserData): boolean {
  return isValidEmail(user.email) && user.age >= 18;
}

export function formatUserDisplayName(user: UserData): string {
  const localPart = user.email.split("@")[0];
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

export async function registerUser(user: UserData, userRepo: UserRepository): Promise<UserRecord> {
  if (!validateUserData(user)) {
    throw new ValidationError("Invalid user registration details");
  }
  return userRepo.save(user);
}
```

### Bad: 150-Line God Function
```typescript
// Bad: Validates, sends email, connects to DB, parses JSON, logs metrics all in one giant block
export async function doEverythingForUser(rawInput: any) {
  // 30 lines of manual string parsing...
  // 40 lines of nested if/else statements...
  // Direct DB queries mixed with nodemailer calls...
  // console.log("Done user!");
}
```

---

## 2. Readability over Obscure "Smart" Code

### Good: Clear, Intention-Revealing Code
```typescript
export function getActiveSubscribers(users: User[]): User[] {
  return users.filter(user => user.subscription.isActive && !user.isSuspended);
}
```

### Bad: Overly Compact / Obfuscated One-Liner
```typescript
// Hard to read, prone to operator precedence mistakes
export const getActive = (u: any[]) => u.reduce((a, b) => (b.s?.a && !b.susp ? [...a, b] : a), []);
```

---

## 3. Fixing Root Causes vs Disabling Linters

### Good: Type Guard / Proper Type Narrowing
```typescript
interface ApiSuccess<T> {
  status: "success";
  data: T;
}

interface ApiError {
  status: "error";
  message: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function handleResponse<T>(res: ApiResponse<T>): T {
  if (res.status === "error") {
    throw new Error(res.message);
  }
  return res.data; // TypeScript automatically narrows to ApiSuccess<T>
}
```

### Bad: Suppressing TypeScript / Linter
```typescript
export function handleResponse(res: any): any {
  // @ts-ignore - Ignore type error
  return res.data.items[0].value; // Will crash at runtime if res.data is undefined
}
```

---

## 4. No Secrets or Debug Artifacts

### Good: Configured Environment Variables
```typescript
const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  throw new Error("Missing required environment variable DB_PASSWORD");
}
```

### Bad: Hardcoded Secrets & Orphan Logs
```typescript
const dbPassword = "SuperSecretPassword123!"; // Hardcoded secret!
console.log("DEBUG: password is", dbPassword); // Exposing credentials in log
```
