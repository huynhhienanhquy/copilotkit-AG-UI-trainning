# Security

## Purpose
Prevent security errors and malicious behavior in code or Agent workflows.

## Rules
- Do not read, print, commit or send secrets outside the necessary scope.
- Do not include `.env`, private key, access token or credential in the output.
- Validate and sanitize data at the trust boundary.
- Check authorization, not just authentication.
- Avoid command injection, SQL injection, XSS, SSRF, path traversal and insecure deserialization.
- Use prepared statements or safe APIs instead of concatenating query strings.
- Do not reduce security controls just to test passes.
- New dependencies must have a reason and be checked for source, license, maintenance and risk.
