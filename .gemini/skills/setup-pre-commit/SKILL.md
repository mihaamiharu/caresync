---
name: setup-pre-commit
description: >
  Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. 
  Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add 
  commit-time formatting/typechecking/testing.
---

# Setup Pre-Commit Hooks

## Core Goal

Set up a robust pre-commit workflow using Husky and lint-staged to ensure code quality before every commit.

## Workflow

### 1. Detect Package Manager

Check for lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`) to identify the preferred package manager. Default to `npm` if unknown.

### 2. Install Dependencies

Install the following as development dependencies:

- `husky`
- `lint-staged`
- `prettier`

### 3. Initialize Husky

Run `npx husky init`. This should create the `.husky/` directory and add the `prepare` script to `package.json`.

### 4. Configure Pre-commit Hook

Update `.husky/pre-commit` with:

```bash
npx lint-staged
<package-manager> run typecheck
<package-manager> run test
```

_Note: Only include `typecheck` and `test` if those scripts exist in `package.json`._

### 5. Configure lint-staged

Create a `.lintstagedrc` file in the root:

```json
{
  "*": "prettier --ignore-unknown --write"
}
```

### 6. Ensure Prettier Config

If no Prettier configuration exists, create a `.prettierrc` with sensible defaults:

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "printWidth": 80,
  "singleQuote": false,
  "trailingComma": "es5",
  "semi": true,
  "arrowParens": "always"
}
```

### 7. Validation

- Verify `.husky/pre-commit` exists and is executable.
- Verify `.lintstagedrc` and `prettier` configs exist.
- Run `npx lint-staged` to test the setup.

### 8. Finalize

Stage the changes and propose a commit: `Add pre-commit hooks (husky + lint-staged + prettier)`.
