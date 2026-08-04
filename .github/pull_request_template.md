## What does this change?

<!-- Brief description -->

## Why?

<!-- Bug fix, feature, refactor -->

## Checklist

- [ ] `npx tsc --noEmit` passes locally
- [ ] `npm test` passes locally
- [ ] `npm run build` succeeds locally
- [ ] If this touches Supabase tables: confirmed RLS is enabled and policies are correct (check the live database directly, not just migration files — see `docs/AUDIT_2026-08.md` for why)
- [ ] If this touches `package.json` dependencies: checked `peerDependencies` of anything using the removed/added package, not just direct imports in `src/`
- [ ] Verified the actual Vercel deployment goes green after merge, not just CI

CI (`.github/workflows/ci.yml`) will run typecheck, test, and build automatically.
