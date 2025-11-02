#!/bin/bash
# Sync with upstream Qwen CLI while preserving customizations

set -e

echo "🔄 Syncing with upstream Qwen CLI..."

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  You're on branch '$CURRENT_BRANCH', not 'main'"
    echo "   Please switch to main first: git checkout main"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes"
    echo "   Please commit or stash them first"
    exit 1
fi

# Fetch upstream changes
echo "📥 Fetching upstream changes..."
git fetch upstream

# Check if we're behind
BEHIND_COUNT=$(git rev-list HEAD..upstream/main --count)
if [ "$BEHIND_COUNT" -eq 0 ]; then
    echo "✅ Already up to date with upstream/main"
    exit 0
fi

echo "📊 Your fork is $BEHIND_COUNT commit(s) behind upstream/main"

# Create backup branch
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
echo "💾 Creating backup branch: $BACKUP_BRANCH"
git branch $BACKUP_BRANCH

# Attempt rebase
echo "🔀 Rebasing your commits onto upstream/main..."
if git rebase upstream/main; then
    echo "✅ Rebase successful"
else
    echo "⚠️  Rebase conflicts detected"
    echo "📝 Conflicts in custom files are expected"
    echo "💡 Please resolve conflicts manually, prioritizing custom provider code"
    echo "   Custom files to protect:"
    echo "   - packages/core/src/providers/**"
    echo "   - packages/cli/src/ui/commands/providersCommand.ts"
    echo "   - packages/cli/src/ui/commands/modelsCommand.ts"
    echo "   - scripts/sync-upstream.sh"
    echo "   - LOCAL_PROVIDERS.md, DEVELOPMENT.md, CUSTOMIZATIONS.md"
    echo ""
    echo "After resolving conflicts, run:"
    echo "  git add ."
    echo "  git rebase --continue"
    echo ""
    echo "To abort the rebase:"
    echo "  git rebase --abort"
    echo "  git reset --hard $BACKUP_BRANCH"
    exit 1
fi

# Verify custom providers still exist
if [ ! -d "packages/core/src/providers" ]; then
    echo "❌ Custom providers directory missing!"
    echo "🔙 Restoring from backup: $BACKUP_BRANCH"
    git reset --hard $BACKUP_BRANCH
    exit 1
fi

# Run tests (if applicable)
echo "🧪 Running tests..."
if npm test 2>/dev/null; then
    echo "✅ Tests passed"
else
    echo "⚠️  Tests failed or not configured"
    echo "   Please verify manually that the changes work correctly"
fi

echo ""
echo "✅ Sync completed successfully"
echo "🗑️  Backup branch created: $BACKUP_BRANCH"
echo "   You can delete it if everything works: git branch -d $BACKUP_BRANCH"
echo ""
echo "📝 Next steps:"
echo "   1. Test the local providers to ensure they still work"
echo "   2. Update CUSTOMIZATIONS.md if needed"
echo "   3. Push to your fork: git push origin main --force-with-lease"
echo ""
echo "⚠️  Note: You'll need to force push since rebase rewrote history"
echo "   The --force-with-lease flag is safer than --force"
