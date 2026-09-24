# Code Comments

## Purpose
Ensure every function has comments that help readers understand what it does, why it exists, and how to use it correctly — without reading the implementation.

## Rules

### Comment Structure
Every function must have a comment that answers these questions:
1. **What** does this function do?
2. **Why** does this function exist? (business context or problem it solves)
3. **When** should I use this function?
4. **How** do I call it correctly?

### Required Elements
- **Summary line**: One sentence describing the function's purpose.
- **Detailed description** (if needed): Explain the logic, algorithm, or business rule.
- **Parameters**: Name, type, and what each parameter means — not just "the items" but "the list of items to process, must not be empty".
- **Return value**: What the caller gets back and what it represents.
- **Exceptions/Errors**: When and why the function throws, so callers know what to handle.
- **Side effects**: If the function modifies external state (database, file, API), mention it.
- **Constraints**: Preconditions (e.g., "requires authenticated user") and postconditions (e.g., "transaction is committed").
- **Examples**: Show realistic usage for non-obvious functions.

### Quality Standards
- Write comments for someone who has never seen this code before.
- Do not repeat the implementation; explain the **intent** and **context**.
- Keep comments up to date when the function changes.
- Do not add redundant comments that restate obvious code.
- Use the language-native format: JSDoc for JS/TS, Docstring for Python.

## Examples

### Good — Helps reader understand the function

```typescript
/**
 * Apply a discount coupon to a shopping cart and return the updated totals.
 *
 * This function validates the coupon, checks eligibility (minimum order amount,
 * product categories, expiration date), and applies the discount. If the coupon
 * is invalid or expired, it throws an error with a user-friendly message.
 *
 * @param cart - The shopping cart to apply the coupon to. Must contain at least one item.
 * @param couponCode - The coupon code entered by the user (case-insensitive).
 * @returns The updated cart with discount applied and new total calculated.
 * @throws {CouponNotFoundError} If the coupon code does not exist in the system.
 * @throws {CouponExpiredError} If the coupon has passed its expiration date.
 * @throws {CouponNotApplicableError} If the cart does not meet coupon requirements.
 *
 * @example
 * const cart = await applyCouponToCart(userCart, "SAVE20");
 * console.log(cart.discount); // 20% off
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}
```

### Bad — Does not help reader understand

```typescript
// Bad: Too vague, reader still needs to read the code
/**
 * Applies a coupon.
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}

// Bad: Repeats the implementation
/**
 * Loops through the items, finds the coupon, checks if valid,
 * calculates discount, updates the total, and returns the cart.
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}

// Bad: Missing context about when to use or edge cases
/**
 * @param cart - Cart
 * @param couponCode - Coupon code
 * @returns Cart
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}
```

### Python Example

```python
def apply_coupon_to_cart(cart: Cart, coupon_code: str) -> Cart:
    """Apply a discount coupon to a shopping cart and return the updated totals.

    This function validates the coupon, checks eligibility (minimum order amount,
    product categories, expiration date), and applies the discount. If the coupon
    is invalid or expired, it raises an error with a user-friendly message.

    Args:
        cart: The shopping cart to apply the coupon to. Must contain at least one item.
        coupon_code: The coupon code entered by the user (case-insensitive).

    Returns:
        The updated cart with discount applied and new total calculated.

    Raises:
        CouponNotFoundError: If the coupon code does not exist in the system.
        CouponExpiredError: If the coupon has passed its expiration date.
        CouponNotApplicableError: If the cart does not meet coupon requirements.

    Example:
        >>> cart = apply_coupon_to_cart(user_cart, "SAVE20")
        >>> print(cart.discount)  # 20% off
    """
    # ...
```

### Simple Function

```typescript
/**
 * Get the currently authenticated user's ID.
 *
 * Returns the user ID from the JWT token stored in the auth context.
 * Must be called after authentication middleware has run.
 *
 * @returns The user ID string, or throws if no user is authenticated.
 */
function getCurrentUserId(): string {
  return context.userId;
}
```

## Exceptions
- Test files may omit comments when the test name already describes the scenario.
- Auto-generated code may follow the generator's documentation convention.
- Trivial one-liners (e.g., getters) may use a one-line comment if the name is self-explanatory.
