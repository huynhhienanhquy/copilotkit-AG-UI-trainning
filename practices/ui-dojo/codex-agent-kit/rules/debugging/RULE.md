# Debugging and Error Investigation

## Purpose
Ensure rigorous, evidence-driven error diagnosis and prevent superficial or symptom-masking fixes.

## Rules
- **Inspect Full Tracebacks & Logs First**: Never form a diagnostic hypothesis for a runtime failure or test breakage without reading the full, un-truncated error log and traceback.
- **No Superficial Symptom Patches**: Never resolve errors by masking symptoms (e.g., swallowing exceptions silently, returning dummy fallback data, commenting out broken assertions, or deleting failing unit tests).
- **Trace Upstream Causes**: If an API or function receives null or missing data, trace the upstream data provider instead of wrapping the caller in a silent try/except or default fallback.
- **Empirical Verification**: Every code fix must be justified by empirical log evidence or verified root cause analysis. Run the test suite or reproduction command after editing code to confirm resolution.

## Safe Path
If the root cause of an error cannot be identified from existing logs, add targeted logging or diagnostic probes to capture empirical evidence rather than guessing.
