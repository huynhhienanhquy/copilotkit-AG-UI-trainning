---
name: accessibility
description: Audit and improve accessibility for web UIs. Use for WCAG compliance, keyboard navigation, screen reader support, color contrast, focus management, ARIA usage, and semantic HTML.
---

# Accessibility

## Goal
Ensure interfaces are usable by people with diverse abilities, including visual, motor, auditory, and cognitive disabilities.

## Trigger conditions
- Auditing existing UI for accessibility issues
- Building new components with accessibility in mind
- Fixing accessibility bugs or WCAG violations
- Adding screen reader or keyboard support
- Reviewing color contrast or focus management

## Workflow
1. Identify the target WCAG level (A, AA, or AAA) and applicable success criteria.
2. Audit semantic HTML: headings hierarchy, landmarks, lists, tables, and form structure.
3. Verify keyboard navigation: all interactive elements reachable, logical tab order, no keyboard traps.
4. Check focus management: visible focus indicator, focus returned after modal/dialog close.
5. Verify screen reader experience: labels, alt text, ARIA roles, live regions, and announcements.
6. Check color contrast ratios against WCAG minimums (4.5:1 normal text, 3:1 large text).
7. Verify form accessibility: labels associated with inputs, error messages linked, required fields indicated.
8. Test with actual assistive technology when possible (VoiceOver, NVDA, screen reader).
9. Document findings with severity, affected users, and remediation steps.

## Guardrails
- Do not add ARIA attributes when native HTML semantics suffice.
- Do not use `tabIndex` values greater than 0.
- Do not rely solely on color to convey meaning.
- Do not auto-focus elements that disrupt screen reader navigation.

## Definition of done
- Semantic HTML is correct and complete.
- All interactive elements are keyboard accessible.
- Focus management follows WCAG 2.1 guidelines.
- Screen reader experience is verified.
- Color contrast meets target WCAG level.
- Findings documented with severity and remediation.
