# Branch Protection Setup

This repository uses branch protection rules to maintain code quality and prevent accidental changes to the main branch.

## Current Protection Rules

The `main` branch is protected with the following rules:

### ✅ Required Status Checks
- **Deploy Worker** - Worker deployment must succeed before merging
- Status checks must pass before merging
- Branches must be up to date before merging

### 🔒 Other Protections
- **Require conversation resolution** - All review comments must be resolved
- **No force pushes** - Prevents rewriting history
- **No deletions** - Main branch cannot be deleted
- **Allow fork syncing** - Enables keeping forks up to date

### 📝 Pull Request Reviews
- Stale reviews are dismissed when new commits are pushed
- No required approving reviews (you're the only developer)

## Manual Setup (Required)

GitHub Actions cannot apply all branch protection rules due to API limitations. You need to manually configure:

1. **Go to Repository Settings**:
   - https://github.com/Rehchu/FitTrack-Pro/settings/branches

2. **Click "Add branch protection rule"**

3. **Branch name pattern**: `main`

4. **Enable these settings**:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Search and add: `Deploy Worker`
     - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

5. **Click "Create"**

## Automated Workflow

The `.github/workflows/branch-protection.yml` workflow can:
- Check current protection status
- Attempt to apply protection rules via API

### Run Manually
Go to: https://github.com/Rehchu/FitTrack-Pro/actions/workflows/branch-protection.yml
- Click "Run workflow"
- Select action: `apply` or `status`

## Working with Protected Branches

### Making Changes
1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes and commit
3. Push: `git push origin feature/my-feature`
4. Create a Pull Request on GitHub
5. Wait for "Deploy Worker" check to pass
6. Merge the PR

### Emergency Hotfix
If you need to bypass protection (not recommended):
1. Temporarily disable branch protection in Settings
2. Make your changes directly to main
3. Re-enable branch protection immediately

## Code Owners

The `.github/CODEOWNERS` file defines who gets auto-requested for review:
- All files: @Rehchu
- Critical paths require your approval

## Benefits

- ✅ Prevents accidental direct commits to main
- ✅ Ensures all changes go through CI/CD
- ✅ Worker deployments are tested before production
- ✅ Dependabot PRs still work seamlessly
- ✅ Maintains clean git history
