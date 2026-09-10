# Security Examples

Examples demonstrating defenses against common vulnerabilities including injection, IDOR, SSRF, and path traversal.

---

## 1. SQL Injection Prevention

### Good: Parameterized Queries
```typescript
// PostgreSQL parameterized query
const query = 'SELECT id, email, role FROM users WHERE organization_id = $1 AND email = $2';
const result = await db.query(query, [orgId, userEmail]);
```

### Bad: Raw String Concatenation
```typescript
// Bad: Vulnerable to SQL injection
const query = `SELECT id, email, role FROM users WHERE organization_id = '${orgId}' AND email = '${userEmail}'`;
const result = await db.query(query);
```

---

## 2. Insecure Direct Object References (IDOR) & Authorization Checks

### Good: Validating Resource Ownership
```typescript
export async function getDocumentById(userId: string, orgId: string, documentId: string) {
  // Query includes both resource ID AND the tenant/user ownership constraint
  const doc = await db.documents.findOne({
    where: {
      id: documentId,
      organizationId: orgId, // Prevents cross-tenant access!
    },
  });

  if (!doc) {
    throw new NotFoundError("Document not found");
  }

  return doc;
}
```

### Bad: Querying Solely by Target ID Without Authorization
```typescript
// Bad: Allows any authenticated user to view any document by guessing documentId
export async function getDocumentById(userId: string, documentId: string) {
  return db.documents.findById(documentId);
}
```

---

## 3. Path Traversal Prevention

### Good: Validating Canonical Path within Allowed Directory
```typescript
import path from "path";
import fs from "fs/promises";

export async function readUserUploadedFile(userFileName: string): Promise<Buffer> {
  const UPLOAD_DIR = path.resolve("/var/app/uploads");
  const safePath = path.resolve(UPLOAD_DIR, userFileName);

  // Ensure resolved path starts with the allowed directory
  if (!safePath.startsWith(UPLOAD_DIR + path.sep)) {
    throw new SecurityError("Access denied: Invalid file path.");
  }

  return fs.readFile(safePath);
}
```

### Bad: Naive Path Joining
```typescript
// Bad: Attacker provides "../../etc/passwd" to read arbitrary system files
export async function readUserUploadedFile(userFileName: string) {
  return fs.readFile(`/var/app/uploads/${userFileName}`);
}
```

---

## 4. Server-Side Request Forgery (SSRF) Defense

### Good: Domain Allowlisting and Private IP Blocking
```typescript
export async function fetchWebhook(targetUrlString: string) {
  const parsed = new URL(targetUrlString);

  // 1. Only allow HTTPS
  if (parsed.protocol !== "https:") {
    throw new ValidationError("Only HTTPS webhooks are permitted.");
  }

  // 2. Block private IP ranges, localhost, and AWS metadata endpoints (169.254.169.254)
  if (isPrivateOrReservedIp(parsed.hostname)) {
    throw new SecurityError("Requests to private network addresses are blocked.");
  }

  return fetch(parsed.toString(), { timeout: 3000 });
}
```
