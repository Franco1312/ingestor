# Husky Git Hooks

This directory contains Git hooks managed by Husky.

## Pre-commit Hook

The pre-commit hook automatically runs:
- ESLint with auto-fix for TypeScript/JavaScript files
- Prettier formatting for all supported file types

## Manual Testing

You can test the pre-commit hook manually:

```bash
# Test lint-staged (what runs in pre-commit)
pnpm pre-commit

# Test individual tools
pnpm lint
pnpm format
```

## Configuration

- **ESLint**: Configured in `eslint.config.js`
- **Prettier**: Configured in `prettier.config.cjs`
- **lint-staged**: Configured in `package.json` under `lint-staged`

## Bypassing Hooks (Not Recommended)

If you need to bypass the pre-commit hook (not recommended):

```bash
git commit --no-verify -m "your message"
```

## Troubleshooting

If the pre-commit hook fails:
1. Fix the linting/formatting issues
2. Stage the fixed files
3. Commit again

The hook will prevent commits with:
- ESLint errors
- Unformatted code
- TypeScript compilation errors
