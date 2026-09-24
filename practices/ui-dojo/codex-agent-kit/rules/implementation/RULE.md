# Implementation

## Purpose
Specifies how Agents can safely edit code.

## Rules
- Make minimal changes that meet requirements.
- Keep the existing style, naming and folder structure intact.
- Handle loading, empty, error and retry states when related to UI or async flow.
- With async code, consider cancellation, stale response, timeout and race condition.
- With APIs, validate input at the boundary and return structured errors.
- For databases, consider transactions, migration rollback and backward compatibility.
- Do not change generated files manually if they have a source generator.
