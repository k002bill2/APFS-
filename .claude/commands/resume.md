---
description: Resume work from dev docs after session restart or compaction
---

Resume the current development task:

1. Find the active task in `dev/active/`
2. Read all three files:
   - `*-plan.md` → understand the overall plan
   - `*-context.md` → understand current state and decisions
   - `*-tasks.md` → identify the next uncompleted tasks
3. Summarize:
   - Overall progress (X/Y tasks complete)
   - What was last worked on
   - What should be done next
4. Ask the user to confirm the next steps before proceeding.

If multiple active tasks exist, list them and ask which to resume.
