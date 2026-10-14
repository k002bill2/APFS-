# Codex Harness Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an APFS-specific Codex harness that turns the lecture's AGENTS, Skills, MCP, Hooks, and Subagents concepts into repo-local guidance, reusable workflow assets, and guardrails.

**Architecture:** Keep product truth in `CLAUDE.md`, use `AGENTS.md` as the Codex routing and enforcement entrypoint, package repeatable APFS UI work as a project Skill under `.agents/skills/`, and add lightweight hook scripts that prevent known high-risk edits. MCP and subagents are documented as extension points rather than enabled prematurely.

**Tech Stack:** Codex repo guidance, project-local Skills, shell hook scripts, Vite + React 18 + TypeScript.

## Global Constraints

- `CLAUDE.md` remains the product single source of truth.
- Current canonical implementation is Vite + React under `src/`; legacy Korean HTML files are not the primary edit surface.
- Do not modify unrelated dirty worktree changes.
- Validate with `npm run build`.

---

### Task 1: Align Codex Entry Guidance

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `CLAUDE.md` sections on project overview, file structure, execution, edit notes, tokens, and domain context.
- Produces: A concise Codex entrypoint that routes future agents to the correct canonical source and validation commands.

- [ ] **Step 1: Replace stale legacy-bundle guidance**

Update `AGENTS.md` so it states that `src/` is the canonical editable source and Vite build output is the deployed artifact.

- [ ] **Step 2: Add Codex harness operating rules**

Add explicit sections for read-before-edit, edit boundaries, verification, and harness assets.

- [ ] **Step 3: Inspect result**

Run: `sed -n '1,220p' AGENTS.md`
Expected: The file no longer says the root offline HTML is canonical.

### Task 2: Add APFS Dashboard Skill

**Files:**
- Create: `.agents/skills/apfs-dashboard-workflow/SKILL.md`
- Create: `.agents/skills/apfs-dashboard-workflow/references/verification.md`

**Interfaces:**
- Consumes: APFS architecture from `CLAUDE.md`.
- Produces: A reusable workflow for APFS UI/dashboard edits.

- [ ] **Step 1: Create Skill package**

Create a Skill with frontmatter name `apfs-dashboard-workflow` and a description that triggers for APFS dashboard UI, route, menu, data, and visual changes.

- [ ] **Step 2: Add verification reference**

Document build verification, optional preview, and known type-check limitations.

- [ ] **Step 3: Inspect result**

Run: `find .agents/skills/apfs-dashboard-workflow -type f -maxdepth 3 -print`
Expected: `SKILL.md` and `references/verification.md` exist.

### Task 3: Add Hook Guardrails

**Files:**
- Create: `.codex/hooks.json`
- Create: `.codex/config.toml`
- Create: `scripts/codex-guard.sh`

**Interfaces:**
- Consumes: Codex hook lifecycle concept from the lecture.
- Produces: Project-local hook configuration and a deterministic guard script.

- [ ] **Step 1: Add hook config**

Configure `PreToolUse` for shell/apply patch style tool names and call `scripts/codex-guard.sh`.

- [ ] **Step 2: Add guard script**

Implement a POSIX shell script that reads hook JSON from stdin, warns or blocks direct edits to legacy HTML bundles, and reminds agents to edit `src/`.

- [ ] **Step 3: Make script executable**

Run: `chmod +x scripts/codex-guard.sh`
Expected: script mode includes executable bits.

### Task 4: Document Harness Mapping

**Files:**
- Create: `docs/codex-harness.md`

**Interfaces:**
- Consumes: Slide deck analysis and repo architecture.
- Produces: Human-readable operating manual for this repo's Codex harness.

- [ ] **Step 1: Write layer mapping**

Map AGENTS, Memories, Skills, MCP, Hooks, and Subagents to APFS-specific decisions.

- [ ] **Step 2: Include build order and decision matrix**

Explain why this repo implements AGENTS + Skill + Hooks now, while keeping MCP/Subagents as extension points.

- [ ] **Step 3: Cite source**

Link the lecture URL and official concept names without copying long slide text.

### Task 5: Verify

**Files:**
- Read: all changed files

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: Verified repository harness changes.

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 2: Inspect git diff**

Run: `git diff -- AGENTS.md .agents/skills/apfs-dashboard-workflow .codex docs/codex-harness.md docs/superpowers/plans/2026-06-21-codex-harness-engineering.md scripts/codex-guard.sh`
Expected: Diff contains only harness-related changes.

- [ ] **Step 3: Report dirty pre-existing files separately**

Run: `git status --short --branch`
Expected: Existing unrelated `.gitignore` modification is not attributed to this change.
