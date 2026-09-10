# Code Comments Examples

Examples demonstrating communicative, intention-revealing docstrings and comments versus unhelpful noise.

---

## 1. Complete Function Documentation (TypeScript / JSDoc)

### Good: Explains What, Why, When, Parameters, Errors, and Usage
```typescript
/**
 * Apply a discount coupon to a shopping cart and return the recalculated totals.
 *
 * Validates eligibility (minimum order threshold, restricted product categories,
 * expiration status), applies percentage or fixed reduction, and updates tax amounts.
 *
 * @param cart - The user's active shopping cart. Must contain at least one non-gift item.
 * @param couponCode - Alphanumeric coupon identifier provided by the customer (case-insensitive).
 * @returns The updated cart object with the applied discount and adjusted line items.
 * @throws {CouponNotFoundError} When the coupon code does not exist in the database.
 * @throws {CouponExpiredError} When current timestamp exceeds the coupon validity window.
 * @throws {CouponNotApplicableError} When cart subtotal does not meet the required threshold.
 *
 * @example
 * ```ts
 * const updatedCart = await applyCouponToCart(currentCart, "SUMMER2026");
 * console.log(updatedCart.discountAmount); // 15.50
 * ```
 */
export async function applyCouponToCart(
  cart: Cart,
  couponCode: string
): Promise<Cart> {
  // Implementation details...
}
```

### Bad: Redundant or Low-Information Comments
```typescript
// Bad: Obvious restatement of code
/**
 * Function to apply coupon.
 * @param cart cart
 * @param couponCode coupon code
 */
export function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // Loop over items
  for (const item of cart.items) {
    // Add item price
    total += item.price;
  }
}
```

---

## 2. Python Docstrings (Google / Sphinx Style)

### Good: Clear Contract and Edge Cases
```python
def calculate_compound_interest(
    principal: float,
    annual_rate: float,
    compounding_periods: int,
    years: int
) -> float:
    """Calculate the future value of an investment with compound interest.

    Uses the standard compounding formula: A = P * (1 + r/n)**(n*t).
    Designed for financial auditing models where high precision is required.

    Args:
        principal: Initial investment amount in base currency. Must be > 0.
        annual_rate: Nominal annual interest rate expressed as a decimal (e.g., 0.05 for 5%).
        compounding_periods: Times interest compounds per year (e.g., 12 for monthly).
        years: Duration of the investment in integer years. Must be >= 1.

    Returns:
        The total accumulated balance (principal + interest) rounded to 2 decimal places.

    Raises:
        ValueError: If principal <= 0, annual_rate < 0, or compounding_periods <= 0.

    Example:
        >>> calculate_compound_interest(1000.0, 0.05, 12, 5)
        1283.36
    """
    if principal <= 0 or annual_rate < 0 or compounding_periods <= 0:
        raise ValueError("Principal, rate, and compounding periods must be positive.")
    
    return round(principal * (1 + annual_rate / compounding_periods) ** (compounding_periods * years), 2)
```

---

## 3. Explaining Non-Obvious Business Logic and Workarounds

### Good: Explaining the "Why" and Background
```typescript
// Good: Explains why an unusual browser workaround is necessary
// Safari versions < 16.4 have a bug where AbortSignal.timeout() is undefined
// causing uncaught ReferenceErrors during background polling.
const timeoutSignal = typeof AbortSignal.timeout === "function"
  ? AbortSignal.timeout(5000)
  : createLegacyTimeoutSignal(5000);
```

### Bad: Ambiguous or Contextless Comments
```typescript
// Bad: Provides zero context on why or what needs to be fixed
// TODO: fix this later
// HACK: don't touch
const x = val === null ? 0 : val;
```
