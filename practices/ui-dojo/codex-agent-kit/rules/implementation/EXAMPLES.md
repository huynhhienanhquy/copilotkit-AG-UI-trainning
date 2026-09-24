# Implementation Examples

Examples demonstrating minimal targeted modifications, robust async handling, and defensive implementation practices.

---

## 1. Minimal Targeted Modifications

### Good: Surgical Edit Addressing Exactly the Bug
```diff
--- a/src/services/pricingService.ts
+++ b/src/services/pricingService.ts
@@ -24,7 +24,7 @@ export function calculateItemTotal(item: CartItem): number {
-  return item.price * item.quantity - item.discount;
+  return Math.max(0, item.price * item.quantity - (item.discount ?? 0));
 }
```
- Fixes negative price bug and handles optional `discount` without restructuring unrelated functions or reformatting untouched files.

### Bad: Excessive Unrelated Refactoring
```diff
--- a/src/services/pricingService.ts
+++ b/src/services/pricingService.ts
- // Rewrote whole 500-line file into a class with different naming conventions,
- // swapped formatter from Prettier to ESLint styles, broke git blame for entire team.
```

---

## 2. Async Cancellation & Race Condition Prevention

### Good: AbortController and Request Sequencing
```tsx
export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);

    fetchUsers(query, { signal: abortController.signal })
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          logger.error("Failed to fetch users", { err });
          setLoading(false);
        }
      });

    // Cleanup: cancel pending fetch when user types a new letter
    return () => {
      abortController.abort();
    };
  }, [query]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading ? <p>Loading...</p> : <UserList users={results} />}
    </div>
  );
}
```

### Bad: Uncanceled Async Fetch with Race Conditions
```tsx
// Bad: If request A takes 500ms and request B takes 100ms, request A finishes last
// and overwrites newer search results with old data!
useEffect(() => {
  fetchUsers(query).then(data => setResults(data));
}, [query]);
```

---

## 3. Don't Manually Edit Generated Code

### Good: Modifying the Generator Source
```text
- Schema file: `prisma/schema.prisma` -> run `npx prisma generate`
- GraphQL types: `src/schema.graphql` -> run `npm run codegen`
- Protocol Buffers: `proto/user.proto` -> run `protoc --ts_out=...`
```

### Bad: Hand-Editing Auto-Generated Files
```typescript
// Bad: Manually editing `src/generated/graphql.ts` directly.
// The next build or CI step will overwrite all manual edits!
```
