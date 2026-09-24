# Accessibility

## Purpose
Ensure interfaces are usable by people with diverse abilities, meeting WCAG standards and assistive technology requirements.

## Rules
- Use semantic HTML: correct heading hierarchy, landmarks, lists, tables, and form elements.
- All interactive elements must be keyboard accessible with logical tab order.
- Provide visible focus indicators that meet color contrast requirements.
- Associate labels with form inputs using `htmlFor`/`for` or `aria-label`.
- Link error messages to inputs via `aria-describedby`.
- Indicate required fields both visually and programmatically (`required`, `aria-required`).
- Provide alt text for informative images; use empty alt for decorative images.
- Do not rely solely on color to convey meaning; use text, icons, or patterns.
- Use ARIA attributes only when native HTML semantics are insufficient.
- Return focus to the triggering element after modal/dialog close.
- Use live regions (`aria-live`) for dynamic content updates.
- Test with actual assistive technology (VoiceOver, NVDA, or similar).

## Safe path
When uncertain about WCAG compliance, prefer semantic HTML over ARIA, and test with a screen reader before shipping.

## Exceptions
- Data visualization may require alternative text strategies.
- Complex interactive widgets (date pickers, comboboxes) may need ARIA patterns beyond basic semantics.
