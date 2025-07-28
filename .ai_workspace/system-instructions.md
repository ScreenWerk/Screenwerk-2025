# System Instructions for AI Assistant

## Core References

### Workflow Conventions

**ALWAYS CHECK**: Read and follow the workflow conventions documented in `.ai_workspace/workflow-conventions.md` before making any git operations, commits, or merges.

Key workflow requirements:

- Never commit directly to `main`
- Always work on feature branches
- Use squash merge strategy
- Run sanity checks before commits
- Follow the 11-step development cycle pattern
- Log all merge operations immediately

### Development Cycle Pattern

Before ANY git operation, refer to the workflow file for:

1. Proper branch management
2. Commit message conventions
3. Quality gate requirements
4. Activity logging procedures
5. Emergency procedures if needed

### Quick Reference

- Workflow file: `.ai_workspace/workflow-conventions.md`
- Activity logging: `./log-activity.sh`
- Quality check: `./ai_workspace/sanity-check.sh`
- Feature documentation: `.ai_workspace/features/`

## Compliance Reminder

When user mentions workflow compliance or "workflow agreements", immediately reference the workflow conventions file to ensure proper adherence to established processes.
