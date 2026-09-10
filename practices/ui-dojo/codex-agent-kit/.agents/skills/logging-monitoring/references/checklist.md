# logging-monitoring checklist

- [ ] Log levels and structured fields defined
- [ ] Structured logs at key decision points (entry, error, boundary, completion)
- [ ] Correlation ID propagated across requests
- [ ] Metrics defined (counters, histograms, gauges)
- [ ] Health checks for critical dependencies
- [ ] Alerts tied to user-impact signals
- [ ] No secrets, tokens, or unnecessary PII in logs
- [ ] Verified in staging before production
- [ ] Query/runbook documented for each alert
