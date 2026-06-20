# APFS Verification Reference

## Required

```bash
npm run build
```

Expected result:

- Vite production build completes.
- `dist/` output is generated or refreshed.

## Optional Preview

Use this when visual behavior changed and a browser check is needed.

```bash
npm run preview
```

The configured preview port is usually `http://localhost:4273`.

## TypeScript Note

The repository currently allows Phase 0 migration code with `strict:false`. `tsc --noEmit` may report pre-existing type errors that do not block `vite build`, so do not treat type-check failure as the default gate unless the user specifically asks for type hardening.

## Post-Verification

```bash
git status --short --branch
```

Separate:

- files changed by the current task
- pre-existing modified files
- generated output, if any
