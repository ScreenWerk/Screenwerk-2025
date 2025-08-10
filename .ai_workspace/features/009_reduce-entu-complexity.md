# Feature 009 - Reduce Entu Service Complexity

## Goal

Bring remaining two complexity warnings (fetchEntitiesByType:12, buildScreenGroupWithScreens:10) down to <=8.

## Plan

- Refactor fetchEntitiesByType: extract URL building & response normalization helpers.
- Refactor buildScreenGroupWithScreens: extract screen transformation & dictionary construction.
- Ensure no behavior changes.
- Update sanity check output: expect 0 complexity warnings.

## Success Criteria

- Sanity check passes with 0 complexity warnings.
- Existing functionality unaffected (manual spot check building URLs & returned shapes).

## Notes

Legacy directory fully removed; this is clean-up hardening step.
