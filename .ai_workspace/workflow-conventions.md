# SW25 Development Workflow Conventions

## Git Branch Management

### Core Principles

- **Never commit directly to `main`** - main branch is protected
- **Always work on feature branches** - even for small changes
- **One feature per branch** - keep changes focused and reviewable
- **Clean merge strategy** - prefer fast-forward merges when possible

### Branch Naming Convention

```text
feature/description-of-feature
fix/description-of-fix
docs/description-of-documentation
workflow/description-of-workflow-change
ai/description-of-ai-related-work
```

## Activity Logging Conventions

### Merge Messages

**Always log merge operations** in the activity log with format:

```text
[TIME] - Merged [branch-name] to main - [brief description of feature]
```

Examples:

```text
- `19:43 - Merged ai-workspace-setup to main - established AI workspace with quality tools`
- `20:15 - Merged workflow-conventions to main - documented development processes`
```

### Logging Timing

- **Log merges immediately** after successful merge to main
- **Carry uncommitted logs** to next feature branch when time comes
- **Log significant development milestones** during feature work

### Log Entry Guidelines

- Maximum 10 words for description (script will warn if longer, so we actually **can** squeeze in more if necessary)
- Focus on user-visible outcomes, not technical details
- Use active voice and present tense

## Quality Gates

### Pre-Commit Requirements

1. **Sanity check must pass** - run `./ai_workspace/sanity-check.sh`
2. **ESLint must pass** - no errors allowed, warnings acceptable (as of yet)
3. **File length limits** - max 300 lines for scripts
4. **Documentation updated** - if feature affects user-facing functionality

### Pre-Merge Requirements

1. **All commits must pass sanity check**
2. **Activity log must be updated**
3. **Branch must be based on latest main**
4. **No merge conflicts**

## Development Cycle Pattern

### Ultra-Tight Iteration

Our preferred development style emphasizes:

- **Very short feedback loops** (minutes, not hours)
- **Frequent small commits** within feature branches
- **Immediate validation** with sanity checks
- **Real-time activity logging** to track progress

### Feature Development Flow

1. Discuss feature with team
2. Agree on subject
3. Create feature branch from main
4. Document feature in .ai_workspace/features/[index]_[feature-name].md
5. Make initial commit
6. Run sanity check
7. Log activity
8. Iterate with micro-commits, updating documentation as we go, running sanity checks after each significant change
9. **Before each commit**: `git status` → `git diff` → `git add` → `git commit`
10. Merge to main
11. Log merge
12. Delete feature branch

## Code Style Agreements

### JavaScript Style

- **No semicolons**, **Single quotes**, **Consistent indentation** - configured in ESLint

### Documentation Style

- **Markdown for all docs**, **Clear structure**, **Keep current**, **Use Iconography very sparingly**

## Tool Usage

- **Run sanity check before commits** - address all issues, warnings acceptable
- **Use activity logger for consistent formatting** - log immediately after actions

## Emergency Procedures

### If Accidentally on Main

1. **Stop immediately** - don't make commits
2. **Create feature branch**: `git checkout -b emergency-fix`  
3. **Continue development** on feature branch

### If Direct Commit to Main

1. **Create feature branch** from current main
2. **Reset main** to previous state: `git reset --hard HEAD~1`
3. **Merge properly** when ready

## Exceptions

- **Critical hotfixes** that can't wait for branch workflow
- **Generated files** (build outputs, API schemas) can exceed length limits

## Review and Updates

This document should be reviewed and updated as the team learns what works best. Any changes to workflow conventions should themselves follow the feature branch process documented here.

**Last Updated**: 2025-07-28 by AI Assistant during workflow-conventions feature branch
