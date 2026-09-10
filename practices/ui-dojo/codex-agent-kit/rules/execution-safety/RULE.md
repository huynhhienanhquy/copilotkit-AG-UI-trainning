# Execution Safety

## Purpose
Prevent destructive, unrecoverable, or unauthorized actions by the Agent on system environments, databases, repositories, and external services.

## Rules
- Never execute a destructive or difficult-to-recover action without confirming that it is explicitly authorized and correctly scoped.
- Treat these as high-risk examples, not as an exhaustive command blacklist:
  - Repository and Git: `git push --force`, `git reset --hard`, rewriting shared history, or deleting remote branches.
  - Filesystem: `rm -rf /`, recursive deletion of home or repository roots, or mass deletion outside verified workspace bounds.
  - Database: `DROP DATABASE`, `TRUNCATE TABLE`, destructive production migrations, or data repair without a recovery path.
  - Package and release: `npm publish`, `pip upload`, pushing images, or releasing artifacts to public registries.
- Before a high-risk action, resolve the exact targets, estimate the blast radius, identify a recovery path, and obtain any required approval.
- Perform destructive or state-altering tests in isolated temporary environments or fixtures, never against active production configuration by default.
- Use explicit targets and literal paths. Avoid unresolved variables, broad wildcards, and recursive mass operations unless their expansion has been reviewed.
- Prefer reversible operations and staged changes when they achieve the same outcome.

## Safe Path
When an action may cause irreversible state loss or external impact, stop and ask for confirmation with the exact operation, targets, impact, and recovery plan.
