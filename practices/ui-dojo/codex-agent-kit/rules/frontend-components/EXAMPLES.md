# Frontend Components Examples

Examples demonstrating reusable component design, design system extensions, and comprehensive UI state handling.

---

## 1. Reusing and Extending Shared Design System Components

### Preferred: Add Semantic Props to Shared Component
```tsx
// components/common/Button/Button.tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leadingIcon?: React.ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  leadingIcon,
  children,
  disabled,
  ...rest
}: ButtonProps) => (
  <button
    disabled={disabled || loading}
    className={`btn btn-${variant} btn-${size}`}
    {...rest}
  >
    {loading && <span className="spinner" aria-hidden="true" />}
    {!loading && leadingIcon && <span className="btn-icon">{leadingIcon}</span>}
    <span>{children}</span>
  </button>
);

// Consumption in pages/CheckoutPage/CheckoutPage.tsx
<Button
  variant="primary"
  size="lg"
  loading={isSubmitting}
  leadingIcon={<LockIcon />}
  onClick={handleCheckout}
>
  Confirm & Pay
</Button>
```

### Avoid: Bypassing with Raw HTML or Page-Specific Props
```tsx
// Bad: Bypasses design system styling, accessibility tokens, and loading states
<button className="my-custom-red-btn" onClick={handleCheckout}>Pay</button>

// Bad: Page-specific prop polluting shared design system
<Button isCheckoutPagePayButton={true}>Pay</Button>
```

---

## 2. Comprehensive UI State Handling

### Good: Handling Loading, Error, Empty, and Success States
```tsx
export function OrderListContainer() {
  const { data: orders, isLoading, error, refetch } = useOrders();

  // 1. Loading State
  if (isLoading) {
    return <OrderListSkeleton count={3} />;
  }

  // 2. Error State with Retry
  if (error) {
    return (
      <div role="alert" className="error-banner">
        <p>Unable to load your orders: {error.message}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  // 3. Empty State
  if (!orders || orders.length === 0) {
    return (
      <div className="empty-state">
        <h3>No orders yet</h3>
        <p>When you make a purchase, your orders will appear here.</p>
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  // 4. Success / Populated State
  return (
    <ul className="order-list" aria-label="Recent Orders">
      {orders.map((order) => (
        <OrderItem key={order.id} order={order} />
      ))}
    </ul>
  );
}
```
