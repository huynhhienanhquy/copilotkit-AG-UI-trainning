# Frontend State Management Examples

Examples demonstrating derived state, async cancellation, and selector optimizations.

---

## 1. Deriving State During Render

### Preferred: Pure Derivation During Render
```tsx
interface ProductSearchProps {
  products: Product[];
  filterCategory: string;
}

export function ProductSearch({ products, filterCategory }: ProductSearchProps) {
  // Derived state: re-computed automatically when dependencies change without extra render cycles
  const filteredProducts = useMemo(() => {
    if (!filterCategory) return products;
    return products.filter((p) => p.category === filterCategory);
  }, [products, filterCategory]);

  return (
    <div>
      <p>Found {filteredProducts.length} items</p>
      <ProductGrid items={filteredProducts} />
    </div>
  );
}
```

### Avoid: Redundant State Synchronized with useEffect
```tsx
// Bad: Redundant state causes state mismatch, lag, and double rendering
export function ProductSearch({ products, filterCategory }: ProductSearchProps) {
  const [filtered, setFiltered] = useState<Product[]>([]);

  useEffect(() => {
    setFiltered(products.filter((p) => p.category === filterCategory));
  }, [products, filterCategory]);

  return <ProductGrid items={filtered} />;
}
```

---

## 2. Async Effects and Cancellation

### Preferred: AbortController with Cleanup
```tsx
export function UserProfileViewer({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetchUserProfile(userId, { signal: controller.signal })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          logger.error("Profile fetch failed", { err });
          setLoading(false);
        }
      });

    return () => {
      // Abort in-flight request if userId changes or component unmounts
      controller.abort();
    };
  }, [userId]);

  if (loading) return <Spinner />;
  return profile ? <ProfileCard profile={profile} /> : <p>Not found</p>;
}
```

---

## 3. Global Store with Narrow Selectors

### Preferred: Narrow Zustand / Redux Selectors
```tsx
// stores/cartStore.ts
export const useCartStore = create<CartState>((set) => ({
  items: [],
  isOpen: false,
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}));

// components/CartBadge.tsx
// Subscribes ONLY to items.length changes, avoiding re-renders when isOpen changes
export function CartBadge() {
  const itemCount = useCartStore((state) => state.items.length);
  return <span className="badge">{itemCount}</span>;
}
```
