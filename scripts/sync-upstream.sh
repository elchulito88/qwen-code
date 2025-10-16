#!/bin/bash
# Sync with upstream Qwen CLI while preserving customizations

set -e

echo "🔄 Syncing with upstream Qwen CLI..."

# Fetch upstream changes
echo "📥 Fetching upstream changes..."
git fetch upstream

# Create backup branch
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
echo "💾 Creating backup branch: $BACKUP_BRANCH"
git branch $BACKUP_BRANCH

# Attempt merge
echo "🔀 Attempting to merge upstream/main..."
if git merge upstream/main -m "Sync with upstream" --no-edit; then
    echo "✅ Merge successful"
else
    echo "⚠️  Merge conflicts detected"
    echo "📝 Conflicts in custom files are expected"
    echo "💡 Please resolve conflicts manually, prioritizing custom provider code"
    echo "   Custom files to protect:"
    echo "   - packages/core/src/providers/**"
    echo "   - scripts/sync-upstream.sh"
    echo "   - CUSTOMIZATIONS.md"
    echo ""
    echo "After resolving conflicts, run:"
    echo "  git add ."
    echo "  git commit"
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
echo "📝 Don't forget to:"
echo "   1. Test the local providers"
echo "   2. Update CUSTOMIZATIONS.md if needed"
echo "   3. Push to your fork: git push origin main"
