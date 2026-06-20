# Codex Harness Engineering for APFS

Source lecture: [Codex 하네스 엔지니어링](https://devbrothers.ai/lectures/codex/harness-engineering/).

This document maps the lecture's harness layers to the APFS dashboard repository. The goal is not to add process for its own sake. The goal is to make Codex repeat the same safe workflow for this Vite/React dashboard without re-explaining repo rules in every prompt.

## Harness Principle

APFS uses a progressive harness:

1. Fix the rules first.
2. Package repeated dashboard work as a Skill.
3. Add guardrails for high-risk edits.
4. Keep MCP and subagents as extension points until a real workflow needs them.

The current repo is a frontend prototype with no backend/API. Most useful automation is therefore local: source boundaries, build verification, and UI workflow consistency.

## Slide Analysis

| Slide | Lecture point | APFS interpretation |
| --- | --- | --- |
| 1. Title | Codex becomes a repeatable development system, not just a coding tool. | The repo needs checked-in operating rules, not only one-off prompts. |
| 2. Definition | Harness fixes rules, context, procedure, verification, and tool access. | Use `AGENTS.md`, Skill, hook, and docs to encode how APFS work should repeat. |
| 3. System map | AGENTS, Memories, Skills, MCP, Hooks, and Subagents stabilize different layers. | Do not force every concern into one file; split mandatory rules, workflow, and runtime checks. |
| 4. Runtime paths | `~/.codex` is runtime state; `~/.agents` is reusable harness assets; repo-local paths can override or extend. | Use repo-local `.agents/skills/` and `.codex/` for APFS-specific assets. |
| 5. AGENTS scope | Global and project AGENTS files compose; closer files are more specific; AGENTS is guidance, not execution. | Keep root `AGENTS.md` compact and project-specific, with verification commands and source boundaries. |
| 6. AGENTS master prompt | Create nested rules after reading project docs and avoid duplicating README/docs. | APFS root guidance delegates product facts to `CLAUDE.md` and avoids restating the whole dashboard spec. |
| 7. Memories | Memories carry preferences and repeated lessons, but are not mandatory rule sources. | Do not commit generated memory as product policy; use `CLAUDE.md` and `AGENTS.md` for durable rules. |
| 8. Skills | Skills package reusable workflows and domain expertise. | Add `apfs-dashboard-workflow` for recurring UI, route, menu, widget, and data changes. |
| 9. Skill anatomy | A good Skill is small, with references/scripts/assets loaded only when needed. | Keep `SKILL.md` procedural and put build nuance in `references/verification.md`. |
| 10. MCP | MCP connects external systems with scoped tools and permissions. | Leave MCP as an extension point until APFS needs GitHub, Vercel, Figma, browser, or another live system. |
| 11. Hooks | Hooks run during the agentic loop and act as automation/guardrails. | Add a PreToolUse guard for the high-risk APFS mistake: editing legacy bundle HTML directly. |
| 12. Hook lifecycle | Hooks attach to events like prompt submit, pre-tool, permission, post-tool, and stop. | Use PreToolUse because legacy bundle writes should be caught before side effects. |
| 13. Subagents | Subagents split specialized work into separate contexts. | Use only for larger reviews, visual QA, or refactors; default APFS edits do not require them. |
| 14. Decision matrix | Choose the layer based on what needs to be fixed: rules, memory, procedure, tools, or delegation. | The APFS implementation mirrors this table in the decision matrix below. |
| 15. Build order | Start with AGENTS, then Skills, then MCP, then Hooks/Subagents. | APFS already has `AGENTS.md`, so this pass aligns it, adds a Skill, and adds one targeted hook. |
| 16. Takeaway | Move repeated standards, procedures, and verification into executable structure. | Future APFS work should begin from repo-local harness assets instead of prompt recollection. |
| 17. Practice app | The sample app emphasizes fast, shareable output over feature sprawl. | APFS is not Commit Hero, but the lesson is to constrain scope and ship verifiable increments. |
| 18. Service build flow | Interview, plan, setup rules, build, add AI, verify/deploy. | For APFS, the useful part is plan before implementation and build verification at the end. |
| 19. HTML plan review | Turn plans into reviewable artifacts for quick human inspection. | This implementation saves a concrete plan under `docs/superpowers/plans/`. |
| 20. Project rules | Generate AGENTS after a real app skeleton exists, so rules fit the codebase. | APFS rules now reflect the migrated Vite/React app, not the old offline bundle. |
| 21. Harness in practice | Combine interview, plan review, AGENTS, prompt flow, verification, MCP/plugins. | APFS adopts the same combination, with MCP deferred until needed. |
| 22. GitHub integration | Codex Cloud can review PRs using repo AGENTS guidance. | Stronger `AGENTS.md` also improves future cloud or PR review behavior. |
| 23. Q&A | The deck ends with open discussion. | Open questions for APFS are mainly whether to later add Vercel/GitHub MCP and visual QA subagents. |

## Layer Mapping

| Lecture layer | APFS implementation | Purpose |
| --- | --- | --- |
| AGENTS.md | `AGENTS.md` | Codex entrypoint: source of truth routing, edit boundaries, verification commands. |
| Memories | User/session memory, not committed repo state | Helpful recall only. Product rules stay in `CLAUDE.md` and `AGENTS.md`. |
| Skills | `.agents/skills/apfs-dashboard-workflow/` | Reusable workflow for dashboard UI, route, menu, widget, and dummy-data changes. |
| MCP | Documented extension point | Add only when a concrete external system is needed, such as GitHub, Vercel, Figma, or browser automation. |
| Hooks | `.codex/hooks.json`, `scripts/codex-guard.sh` | Runtime guardrail for known risky edits, especially direct legacy HTML bundle mutation. |
| Subagents | Documented extension point | Use for isolated review, visual QA, or large refactors when parallel review is worth the overhead. |

## File Responsibilities

### `CLAUDE.md`

Product single source of truth:

- project overview
- module architecture
- run commands
- design tokens and domain context
- current canonical implementation note

Do not duplicate these facts in other harness files unless the duplicated text is operationally necessary.

### `AGENTS.md`

Codex behavior entrypoint:

- what to read before editing
- which source tree is canonical
- what not to edit by default
- how to validate
- where harness assets live

This file should remain compact and machine-readable.

### `.agents/skills/apfs-dashboard-workflow/`

Reusable APFS workflow:

- route/menu/data edit sequence
- source file boundaries
- visual design constraints
- build verification reference

Use this Skill when the task touches APFS dashboard UI, navigation, dummy data, or visual behavior.

### `.codex/hooks.json` and `scripts/codex-guard.sh`

Guardrail layer:

- detects tool calls that appear to edit `농식품모태펀드 대시보드*.html`
- blocks likely write operations to the legacy bundle unless the user explicitly requested that work
- reminds the agent to edit `src/` and run `npm run build`

Hooks are not a full security boundary. They are a repeatability and safety layer that catches common mistakes early.

## Decision Matrix

| Problem | Put it here | Reason |
| --- | --- | --- |
| Mandatory repo rule | `AGENTS.md` | Loaded as project guidance by Codex-aware tools. |
| Product/domain fact | `CLAUDE.md` | Single source of truth prevents document drift. |
| Repeatable dashboard workflow | `.agents/skills/apfs-dashboard-workflow/` | Procedural knowledge should be reusable and discoverable. |
| Known dangerous edit | Hook script | The check belongs at tool-use time. |
| External service action | MCP config | External access needs explicit tool and permission boundaries. |
| Independent review or QA | Subagent | Separate context helps when the task is large enough to justify overhead. |

## Build Order Used Here

This repo implements the lecture's progressive order:

1. `AGENTS.md`: fixed the stale canonical-source rule and documented validation.
2. Skill: packaged APFS dashboard workflow.
3. Hooks: added a lightweight guard for legacy bundle edits.
4. MCP/Subagents: left as extension points because no current APFS task needs live external systems or parallel delegation by default.

## Verification Standard

Default verification after harness or dashboard changes:

```bash
npm run build
git status --short --branch
```

If visual behavior changes, run a preview server and inspect the relevant route.

```bash
npm run preview
```

## Maintenance Rules

- When product architecture changes, update `CLAUDE.md` first.
- When Codex behavior expectations change, update `AGENTS.md`.
- When a repeated workflow emerges, create or revise a Skill.
- When the same risky action repeats, add or tighten a hook.
- When a workflow needs GitHub, Vercel, Figma, browser, or another external system, add MCP only for the narrow tool surface needed.
