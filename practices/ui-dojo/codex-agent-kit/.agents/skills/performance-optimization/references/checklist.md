# performance-optimization checklist

- [ ] Target metric and acceptable trade-offs defined
- [ ] Baseline measured with environment and conditions documented
- [ ] Optimization layer identified (frontend, API, DB, network, infra)
- [ ] Smallest high-impact change selected
- [ ] Correctness tests still pass after change
- [ ] Before/after comparison under same conditions
- [ ] Trade-offs documented (what improved, what may regress)
- [ ] Performance guard added when applicable (benchmark, budget, CI check)
