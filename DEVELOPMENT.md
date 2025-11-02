# Development Workflow (Local Providers Fork)

This document outlines the development workflow and branch management strategy for this fork of the Qwen CLI with local provider support.

## ⚠️ MANDATORY BRANCH POLICY

**ALL CHANGES AND MODIFICATIONS MUST BE MADE ON A FEATURE BRANCH. NEVER COMMIT DIRECTLY TO `main`.**

This rule applies to:
- ✅ New features
- ✅ Bug fixes
- ✅ Documentation updates
- ✅ Test additions
- ✅ Refactoring
- ✅ Configuration changes
- ✅ Emergency hotfixes
- ✅ **EVERYTHING**

### Why This Rule Exists

1. **Work Tracking**: Every change is tracked in git history with a clear branch name
2. **Rollback Safety**: Easy to revert changes by deleting a branch before merge
3. **Review Capability**: Changes can be reviewed before integration
4. **Parallel Development**: Work on multiple features simultaneously without conflicts
5. **Clean History**: Maintains a clear, organized git history
6. **Upstream Syncing**: Makes it easier to merge upstream changes from QwenLM/qwen-code

## Branch Naming Convention

Use descriptive branch names with these prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features or enhancements | `feature/add-anthropic-provider` |
| `fix/` | Bug fixes | `fix/ollama-timeout-handling` |
| `docs/` | Documentation changes | `docs/update-installation-guide` |
| `test/` | Adding or updating tests | `test/add-streaming-tests` |
| `refactor/` | Code refactoring | `refactor/provider-abstraction` |
| `chore/` | Build, dependencies, tooling | `chore/update-dependencies` |

## Standard Workflow

### 1. Create a Feature Branch

**Before making ANY changes:**

```bash
# Make sure you're on main
git checkout main

# Pull latest changes
git pull origin main

# Create your feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

```bash
# Make your code changes
# Edit files, add features, fix bugs, etc.

# Test your changes
npm test
npm run build

# Verify no TypeScript errors
npm run lint
```

### 3. Commit Your Changes

```bash
# Stage all changes
git add .

# Commit with a clear message
git commit -m "type: brief description

Detailed explanation of what changed and why.

- Bullet points for specifics
- Reference issues if applicable"
```

**Commit Message Format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding tests
- `refactor`: Code refactoring
- `chore`: Build/tooling changes
- `style`: Formatting changes

### 4. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 5. Verify Everything Works

Before merging, ensure:
- [ ] `npm test` passes (all unit tests)
- [ ] `npm run build` succeeds (no build errors)
- [ ] Documentation is updated (if needed)
- [ ] No TypeScript errors
- [ ] Code follows existing patterns

### 6. Merge to Main

```bash
# Switch back to main
git checkout main

# Merge your feature branch
git merge feature/your-feature-name

# Push to remote
git push origin main
```

### 7. Clean Up (Optional)

```bash
# Delete local branch after successful merge
git branch -d feature/your-feature-name

# Delete remote branch (optional)
git push origin --delete feature/your-feature-name
```

## Examples

### Example 1: Adding a New Feature

```bash
# Create branch
git checkout -b feature/add-streaming-progress

# Make changes
# ... implement streaming progress indicator
# ... add tests
# ... update docs

# Commit
git add .
git commit -m "feat: Add streaming progress indicator

Display real-time progress during model streaming responses.
Shows token count and response time metrics.

- Add ProgressIndicator component
- Update streaming handlers
- Add unit tests
- Update LOCAL_PROVIDERS.md with usage examples"

# Push
git push origin feature/add-streaming-progress

# Verify
npm test && npm run build

# Merge
git checkout main
git merge feature/add-streaming-progress
git push origin main

# Clean up
git branch -d feature/add-streaming-progress
```

### Example 2: Fixing a Bug

```bash
# Create branch
git checkout -b fix/huggingface-timeout

# Fix the bug
# ... update timeout logic in huggingface.ts
# ... add regression test

# Commit
git add packages/core/src/providers/huggingface.ts
git add packages/core/src/providers/huggingface.test.ts
git commit -m "fix: Improve HuggingFace timeout handling

Previous implementation didn't properly handle slow API responses.
Now uses AbortController with 30s timeout and proper cleanup.

- Increase timeout from 2s to 30s for HF Inference API
- Add abort signal to fetch requests
- Add regression test for timeout scenario"

# Push and merge
git push origin fix/huggingface-timeout
npm test && npm run build
git checkout main
git merge fix/huggingface-timeout
git push origin main
```

### Example 3: Updating Documentation

```bash
# Create branch
git checkout -b docs/add-troubleshooting-section

# Update docs
# ... edit LOCAL_PROVIDERS.md

# Commit
git add LOCAL_PROVIDERS.md
git commit -m "docs: Add troubleshooting section for Windows users

Add Windows-specific installation and setup instructions.
Include common issues with WSL2 and Docker Desktop.

- Add WSL2 setup guide
- Document Docker Desktop networking issues
- Include PowerShell vs WSL command differences"

# Push and merge
git push origin docs/add-troubleshooting-section
git checkout main
git merge docs/add-troubleshooting-section
git push origin main
```

### Example 4: Adding Tests

```bash
# Create branch
git checkout -b test/add-provider-manager-tests

# Add tests
# ... create comprehensive tests

# Commit
git add packages/core/src/providers/providerManager.test.ts
git commit -m "test: Add comprehensive ProviderManager tests

Increase test coverage for provider detection and selection.
Add edge cases for timeout and error handling.

- Add 12 new test cases
- Cover all provider detection scenarios
- Test concurrent provider checks
- Test error recovery mechanisms"

# Push and merge
git push origin test/add-provider-manager-tests
npm test  # Verify all tests pass
git checkout main
git merge test/add-provider-manager-tests
git push origin main
```

## Working on Multiple Features

You can work on multiple branches simultaneously:

```bash
# Start feature 1
git checkout -b feature/vision-support
# ... make changes to vision support

# Switch to feature 2 (from main)
git checkout main
git checkout -b feature/context-window-config
# ... make changes to context config

# Switch between branches
git checkout feature/vision-support
git checkout feature/context-window-config

# Merge them independently when ready
git checkout main
git merge feature/vision-support
git push origin main

git merge feature/context-window-config
git push origin main
```

## Emergency Hotfixes

Even for critical fixes, create a branch:

```bash
# Create hotfix branch
git checkout -b fix/critical-api-error

# Fix the critical issue
# ... make the fix
# ... add a test

# Commit
git commit -m "fix: Resolve critical API authentication error

Fixes authentication failure causing all requests to fail.
Emergency patch for production issue."

# Quick verification
npm test

# Merge immediately
git checkout main
git merge fix/critical-api-error
git push origin main
```

## What NOT to Do

### ❌ DON'T: Commit Directly to Main

```bash
# WRONG - DO NOT DO THIS
git checkout main
# make changes
git add .
git commit -m "added feature"
git push origin main
```

### ✅ DO: Create a Branch First

```bash
# CORRECT - ALWAYS DO THIS
git checkout -b feature/my-feature
# make changes
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
# verify, then merge
git checkout main
git merge feature/my-feature
git push origin main
```

## Syncing with Upstream

This fork maintains sync capability with the official QwenLM/qwen-code repository using a rebase workflow to keep history clean.

### Quick Sync (Recommended)

Use the npm script:

```bash
npm run sync
```

Or run the script directly:

```bash
./scripts/sync-upstream.sh
```

The script automatically:
1. ✅ Checks that you're on the main branch
2. ✅ Verifies there are no uncommitted changes
3. ✅ Fetches upstream changes from QwenLM/qwen-code
4. ✅ Shows how many commits you're behind
5. ✅ Creates a timestamped backup branch
6. ✅ Rebases your commits onto upstream/main
7. ✅ Runs tests to verify everything still works
8. ✅ Provides clear instructions for force pushing to your fork

**Benefits of rebase over merge:**
- Clean, linear git history
- Your custom commits stay on top of upstream changes
- No merge commits cluttering the history
- Easier to understand what changed and when

### After Successful Sync

Once the sync completes:

```bash
# Test your local providers
npm run start

# If everything works, push to your GitHub fork
git push origin main --force-with-lease
```

**Note:** You must use `--force-with-lease` (or `--force`) because rebase rewrites commit history. The `--force-with-lease` flag is safer as it won't overwrite commits if someone else has pushed to your fork.

### Manual Sync (Advanced)

If you prefer manual control or the script fails:

```bash
# 1. Ensure you're on main with no uncommitted changes
git checkout main
git status  # Should show "nothing to commit, working tree clean"

# 2. Create a backup branch
git branch backup-$(date +%Y%m%d-%H%M%S)

# 3. Fetch upstream
git fetch upstream

# 4. Check how many commits you're behind
git log HEAD..upstream/main --oneline

# 5. Rebase your commits onto upstream
git rebase upstream/main

# 6. If conflicts occur, resolve them
# Edit conflicting files, prioritizing custom code in protected paths
git add .
git rebase --continue

# 7. If you want to abort the rebase
git rebase --abort
git reset --hard backup-YYYYMMDD-HHMMSS

# 8. Test after successful rebase
npm install
npm test
npm run build

# 9. Force push to your fork
git push origin main --force-with-lease
```

### Handling Rebase Conflicts

If conflicts occur during rebase, the script will pause and show you which files have conflicts.

**Protected paths** (keep your custom code):
- `packages/core/src/providers/` - All provider implementations
- `packages/cli/src/ui/commands/providersCommand.ts` - /providers command
- `packages/cli/src/ui/commands/modelsCommand.ts` - /models command
- `LOCAL_PROVIDERS.md` - Local provider documentation
- `DEVELOPMENT.md` - This file
- `CUSTOMIZATIONS.md` - Customization tracking
- `scripts/sync-upstream.sh` - Sync automation script

**Conflict resolution workflow:**

```bash
# 1. See which files have conflicts
git status

# 2. Open each conflicting file and resolve conflicts
# Look for conflict markers: <<<<<<<, =======, >>>>>>>
# Keep your custom code from protected paths

# 3. After resolving each file
git add <resolved-file>

# 4. Continue the rebase
git rebase --continue

# 5. Repeat until all conflicts are resolved

# 6. Test thoroughly
npm test
npm run build
```

## Protected Paths

The following paths contain custom code specific to this fork and should be preserved during upstream syncs:

```
packages/core/src/providers/          # All provider implementations
  ├── base.ts                         # Provider interface
  ├── ollama.ts                       # Ollama provider
  ├── lmstudio.ts                     # LM Studio provider
  ├── huggingface.ts                  # HuggingFace provider
  ├── providerManager.ts              # Provider management
  └── *.test.ts                       # Provider tests

packages/cli/src/ui/commands/
  ├── providersCommand.ts             # /providers command
  └── modelsCommand.ts                # /models command

packages/cli/src/config/
  └── settingsSchema.ts               # Extended with provider config

packages/core/src/config/
  └── config.ts                       # Extended with preferredProvider

LOCAL_PROVIDERS.md                    # Local provider documentation
DEVELOPMENT.md                        # This file
CUSTOMIZATIONS.md                     # Customization tracking
scripts/sync-upstream.sh              # Upstream sync automation
```

## CI/CD Integration

If you set up CI/CD pipelines, ensure they:

1. **Run on all branches** (not just main)
2. **Run tests automatically** on push
3. **Block merges if tests fail**
4. **Verify build succeeds**

Example GitHub Actions workflow snippet:

```yaml
name: CI
on:
  push:
    branches: ['**']  # Run on all branches
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run build
```

## Quick Reference

| Task | Commands |
|------|----------|
| Create feature branch | `git checkout -b feature/name` |
| Create fix branch | `git checkout -b fix/bug-name` |
| Create docs branch | `git checkout -b docs/what-to-document` |
| Switch branches | `git checkout branch-name` |
| List branches | `git branch -a` |
| Delete local branch | `git branch -d branch-name` |
| Delete remote branch | `git push origin --delete branch-name` |
| Verify tests | `npm test` |
| Verify build | `npm run build` |
| Verify everything | `npm test && npm run build` |
| Merge to main | `git checkout main && git merge feature/name` |
| Sync with upstream | `npm run sync` or `./scripts/sync-upstream.sh` |
| Push after sync | `git push origin main --force-with-lease` |

## Summary

**Golden Rule: ALWAYS create a branch before making ANY changes. NO exceptions.**

This keeps the repository:
- ✅ Organized and trackable
- ✅ Safe from accidental mistakes
- ✅ Ready for collaboration
- ✅ Compatible with upstream syncing
- ✅ Maintainable long-term

When in doubt:
1. Create a branch
2. Make your changes
3. Test thoroughly
4. Merge when confident

**Remember: Branches are cheap, mistakes on main are expensive.**
