# CI/CD Pipeline

## GitHub Actions Workflow

Located in `.github/workflows/ci.yml`

### Pipeline Steps

1. **Checkout** - Clone repository
2. **Setup Node** - Install Node.js 20
3. **Install Dependencies** - `npm ci`
4. **Lint** - `npm run lint`
5. **Format Check** - `npm run format:check`
6. **Type Check** - `npm run type-check`
7. **Secrets Scan** - `npm run secrets:scan`
8. **Build** - `npm run build`
9. **Test Coverage** - `npm run test:coverage`
10. **E2E Tests** - `npm run test:e2e`
11. **Upload Artifacts** - Playwright report

### Quality Gates

Pipeline fails if:

- ESLint errors
- Prettier formatting issues
- TypeScript errors
- Secrets detected
- Build fails
- Test coverage < threshold
- E2E tests fail

### Local Pre-commit

Husky runs:

- Commitlint (conventional commits)
- Lint staged files
- Type check

### Setup

```bash
npm install
npm run prepare  # Initialize Husky
```

### Commit Convention

```
feat: add new feature
fix: bug fix
docs: documentation
test: add tests
chore: maintenance
```
