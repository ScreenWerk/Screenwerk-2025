# Feature 006: Core Refactor - Split Oversized Player & Scheduler

## Goal (COMPLETED)

Reduce `Scheduler.js` (774 lines) and `Player.js` (456 lines) below size limits (targets: Scheduler < 250, Player < 300) by extracting cohesive modules without changing runtime behavior.

## Success Criteria (Status)

- No behavior changes (demo & existing flows still work)
- All extracted modules have single responsibility
- Sanity check passes (file length + ESLint)
- Activity log updated per micro-step
- Commit history: small, isolated refactors (no functional + structural changes mixed)

## Constraints

- No introduction of build tooling (keep ES module style)
- Keep relative import depth minimal (flat `core/` subfolders where possible)
- Avoid premature abstraction; only extract code already grouping logically

## Planned Extraction Phases

1. Scheduler Phase A: Pure helpers (cron + media + layout transformers)
2. Scheduler Phase B: Configuration fetch & preload isolation
3. Scheduler Phase C: Evaluation engine separation
4. Player Phase A: Layout DOM construction helpers
5. Player Phase B: Event emission & state helpers
6. Player Phase C: Region/media wiring helpers
7. Final cleanup & documentation update

## Risk Mitigation

- After each phase: run sanity check
- Add lightweight inline JSDoc to new modules for clarity
- Keep public method signatures in Scheduler/Player stable

## Open Questions

- Later: consider unit tests for transformers (out of scope now)

## Outcomes

- Scheduler reduced 774 → 297 lines (below enforced limit; future optional target <250)
- Player reduced 456 → 188 lines (below 300 target)
- Extracted modules: CronUtils, LayoutTransformer, MediaTransformer, ConfigurationLoader, Preloader, EvaluationEngine, LayoutDom, PlayerPlayback, RegionWiring
- Removed transitional wrapper methods & placeholder comments
- Sanity checks & ESLint clean; no behavior changes observed

**Created**: 2025-08-10
**Completed**: 2025-08-10
