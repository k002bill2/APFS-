---
description: Create comprehensive dev docs for an approved plan (3-file system)
---

Based on the approved plan, create three development documents under `dev/active/$ARGUMENTS/`:

1. Create `dev/active/$ARGUMENTS/$ARGUMENTS-plan.md`
   - Copy the full approved plan
   - Add timeline and phases
   - Include success metrics

2. Create `dev/active/$ARGUMENTS/$ARGUMENTS-context.md`
   - List all relevant files
   - Document key architectural decisions
   - Note any constraints or dependencies
   - Add a "Next Steps" section
   - Timestamp: current date

3. Create `dev/active/$ARGUMENTS/$ARGUMENTS-tasks.md`
   - Convert the plan into a detailed checklist
   - Group by component / area
   - Use checkbox format `[ ]` / `[x]`
   - Add completion counts per section

`$ARGUMENTS` is the task name (e.g., `gp-health-page`).
If not provided, ask the user for the task name before creating files.
