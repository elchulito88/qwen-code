# Claude Code Instructions

This file contains mandatory workflow rules for AI assistants working on this repository.

## 🚨 Mandatory Workflow Rules

### 1. Branch Workflow (STRICTLY ENFORCED)

**NEVER commit directly to main branch. This rule has NO exceptions.**

✅ **ALWAYS do this:**
1. Create a feature branch before making ANY changes
2. Make your changes on the branch
3. Commit with proper message format
4. Push the branch to remote
5. Merge to main using fast-forward
6. Delete the branch after merging

❌ **NEVER do this:**
- Commit directly to main
- Make changes without creating a branch first
- Skip the branch workflow "just this once"
- Bypass the workflow for "small changes"

**Example workflow:**
```bash
# 1. Create branch
git checkout -b feature/add-new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push branch
git push -u origin feature/add-new-feature

# 4. Merge to main
git checkout main
git merge --ff-only feature/add-new-feature
git push origin main

# 5. Cleanup
git branch -d feature/add-new-feature
git push origin --delete feature/add-new-feature
```

### 2. Branch Naming Convention

Use descriptive names with the following prefixes:

- `feature/` - New features or capabilities
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring (no functional changes)
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks, build changes, etc.

**Examples:**
- `feature/local-provider-support`
- `fix/ci-check-failures`
- `docs/fix-readme-attribution`
- `refactor/remove-cloud-dependencies`
- `test/add-provider-tests`
- `chore/update-dependencies`

### 3. Commit Message Format

Follow the conventional commit format:

```
<type>: <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Required footer:**
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Example:**
```
fix: resolve TypeScript build errors in provider tests

- Add non-null assertions to test expectations
- Fix optional chaining with proper null checks
- Update streaming test assertions

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 4. When to Ask the User

Ask for clarification when:
- Multiple valid approaches exist
- Architectural decisions are needed
- Requirements are ambiguous
- Breaking changes are proposed

**Do NOT ask:**
- Which branch name to use (follow the convention)
- Whether to create a branch (always required)
- Basic workflow steps (follow this guide)

## 📚 Reference Documentation

- **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Complete development workflow and guidelines
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute to the project
- **[LOCAL_PROVIDERS.md](../LOCAL_PROVIDERS.md)** - Local provider documentation

## ✅ Pre-flight Checklist

Before making ANY changes, verify:

- [ ] I am NOT on the main branch (`git branch --show-current`)
- [ ] I have created a feature branch
- [ ] The branch name follows the naming convention
- [ ] I have a clear commit message planned

## 🎯 Quick Reference

**Start new work:**
```bash
git checkout -b <type>/<description>
```

**Check current branch:**
```bash
git branch --show-current
```

**Abort if on main:**
```bash
# If you're on main, switch to a new branch immediately
git checkout -b <type>/<description>
```

## 🚫 No Exceptions Policy

This workflow applies to:
- ✅ All code changes
- ✅ All documentation updates
- ✅ All configuration changes
- ✅ Typo fixes
- ✅ Single-line changes
- ✅ Everything else

**There are NO exceptions to this rule.**

---

*Last updated: 2025-11-02*
