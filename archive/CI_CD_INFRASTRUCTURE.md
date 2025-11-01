# CI/CD & Test Infrastructure

## Overview

Complete continuous integration, testing, and deployment infrastructure for Oropendola AI Assistant. This document describes the automated workflows, test suites, and deployment processes that ensure production-quality releases.

---

## 📊 Infrastructure Components

### 1. GitHub Actions Workflows

Located in [`.github/workflows/`](.github/workflows/)

#### **CI Pipeline** ([`ci.yml`](.github/workflows/ci.yml))

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
1. **Lint** - ESLint code quality checks
2. **Type Check** - TypeScript compilation validation
3. **Unit Tests** - Vitest test suite with coverage
4. **Build** - Extension packaging validation
5. **E2E Tests** - Playwright cross-platform tests (Ubuntu, Windows, macOS)
6. **Performance** - Benchmark tests with automatic reporting
7. **Security** - npm audit + Snyk vulnerability scanning
8. **Accessibility** - WCAG 2.1 Level AA compliance tests

**Artifacts:**
- VSIX package (7-day retention)
- Test results (7-day retention)
- Coverage reports (uploaded to Codecov)
- Performance benchmarks (30-day retention)
- Accessibility reports (30-day retention)

**Performance Reporting:**
- Automatic PR comments with benchmark results
- Pass/fail status for performance targets
- Trend tracking across builds

---

#### **Release Pipeline** ([`release.yml`](.github/workflows/release.yml))

Triggered by version tags (`v*`).

**Jobs:**
1. **Build and Test** - Full test suite execution
2. **Publish to VS Code Marketplace** - Official marketplace deployment
3. **Publish to Open VSX** - Alternative marketplace deployment
4. **Create GitHub Release** - Automatic release with VSIX attachment
5. **Send Notifications** - Slack + Discord announcements

**Required Secrets:**
- `VSCE_TOKEN` - VS Code Marketplace personal access token
- `OVSX_TOKEN` - Open VSX personal access token (optional)
- `GITHUB_TOKEN` - Automatically provided by GitHub
- `SLACK_WEBHOOK` - Slack notification webhook (optional)
- `DISCORD_WEBHOOK` - Discord notification webhook (optional)

**Release Notes:**
- Automatically extracted from CHANGELOG.md
- Attached to GitHub release
- Includes version number and changes

---

### 2. Test Infrastructure

#### **Unit Tests** (Vitest)

**Location:** `tests/unit/`

**Command:** `npm test`

**Coverage:** Target 75%+

**Features:**
- Fast execution (< 30s)
- Watch mode for development
- Coverage reports (HTML + LCOV)
- Parallel execution
- Mocking and stubbing support

**Configuration:** Root `vitest.config.ts`

---

#### **E2E Tests** (Playwright)

**Location:** `tests/e2e/`

**Commands:**
- `npm run test:e2e` - Run all E2E tests
- `npm run test:e2e:headed` - Run with visible browser
- `npm run test:e2e:debug` - Debug mode with inspector

**Test Suites:**
1. **Welcome Flow** ([`welcome-flow.spec.ts`](tests/e2e/welcome-flow.spec.ts))
   - 8-step onboarding navigation
   - Skip functionality
   - Progress indicators
   - Keyboard accessibility
   - First-run detection

2. **Help Center** ([`help-center.spec.ts`](tests/e2e/help-center.spec.ts))
   - Category browsing
   - Article navigation
   - Search functionality
   - Keyword matching
   - Accessibility compliance

3. **Conversation** ([`conversation.spec.ts`](tests/e2e/conversation.spec.ts))
   - Message sending/receiving
   - AI response streaming
   - Code block rendering
   - Copy functionality
   - Stop generation
   - Message deletion
   - Response regeneration
   - Keyboard shortcuts

**Configuration:** [`playwright.config.ts`](playwright.config.ts)

**Platforms:** Ubuntu, Windows, macOS (in CI)

**Reporters:**
- HTML (interactive report)
- JSON (machine-readable)
- JUnit XML (CI integration)
- List (console output)

---

#### **Performance Tests**

**Location:** `tests/performance/benchmarks.ts`

**Command:** `npm run test:performance`

**Benchmarks:**

| Metric | Target | Description |
|--------|--------|-------------|
| Extension Load Time | < 1000ms | Activation + initialization |
| Initial Render | < 500ms | First UI paint |
| Search Response | < 100ms | Help center search |
| AI Response First Token | < 2000ms | Streaming start |
| Sync Operation | < 5000ms | Cloud sync all items |
| Memory Usage | < 100MB | Baseline heap usage |
| Large File Processing | < 3000ms | 10MB file handling |
| Conversation History Load | < 1000ms | 100 messages |
| Code Index Search | < 500ms | 10,000 files |
| Batch Operation | < 5000ms | 50 file operations |

**Output:**
- JSON results (`performance-results.json`)
- Markdown report (console)
- Pass/fail status (exit code)
- Historical tracking (timestamped files)

**CI Integration:**
- Automatic PR comments with results
- Trend analysis
- Performance regression detection

---

#### **Accessibility Tests**

**Location:** `tests/a11y/accessibility.spec.ts`

**Command:** `npm run test:a11y`

**Standard:** WCAG 2.1 Level AA

**Tests:**
- Automated axe-core scanning
- Heading hierarchy validation
- Alt text presence
- Button/input labeling
- Form field associations
- Color contrast ratios
- Focus indicators
- Keyboard navigation
- Skip links
- ARIA roles
- Live regions
- Landmark presence
- Error message accessibility
- Modal focus trapping

**Output:**
- JSON report (`accessibility-results.json`)
- Violation summary by severity
- Detailed remediation guidance

---

### 3. Deployment Scripts

Located in [`scripts/`](scripts/)

#### **Deploy Script** ([`deploy.sh`](scripts/deploy.sh))

**Command:** `npm run deploy`

**Options:**
- `--skip-tests` - Skip test execution (not recommended)
- `--dry-run` - Build and package without publishing

**Steps:**
1. ✅ Check prerequisites (Node, npm, git)
2. ✅ Verify git status (clean working directory)
3. ✅ Run full test suite (lint, typecheck, unit tests)
4. ✅ Build extension (production mode)
5. ✅ Package extension (create VSIX)
6. ✅ Publish to VS Code Marketplace
7. ✅ Publish to Open VSX (optional)
8. ✅ Create git tag (`v{version}`)
9. ✅ Push to remote repository
10. ✅ Create GitHub release
11. ✅ Send notifications (Slack, Discord)
12. ✅ Cleanup temporary files

**Environment Variables:**
- `VSCE_TOKEN` - Required for marketplace publishing
- `OVSX_TOKEN` - Optional for Open VSX
- `SLACK_WEBHOOK` - Optional for notifications
- `DISCORD_WEBHOOK` - Optional for notifications

**Safety Features:**
- Confirms before publishing
- Validates working directory
- Requires clean git status
- Creates backup tags
- Handles errors gracefully

---

#### **Version Bump Script** ([`version-bump.sh`](scripts/version-bump.sh))

**Commands:**
- `npm run version:bump` - Bump patch version (1.0.0 → 1.0.1)
- `npm run version:bump:minor` - Bump minor version (1.0.0 → 1.1.0)
- `npm run version:bump:major` - Bump major version (1.0.0 → 2.0.0)

**Actions:**
1. Reads current version from package.json
2. Increments version number
3. Updates package.json
4. Creates CHANGELOG.md entry
5. Displays next steps

**CHANGELOG Format:**
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-
```

**Next Steps:**
1. Edit CHANGELOG.md with changes
2. Review changes (`git diff`)
3. Commit (`git add . && git commit -m "chore: bump version to vX.Y.Z"`)
4. Deploy (`npm run deploy`)

---

#### **Pre-Release Check Script** ([`pre-release-check.sh`](scripts/pre-release-check.sh))

**Command:** `npm run prerelease`

**Checklist:**

| # | Check | Description |
|---|-------|-------------|
| 1 | Git Status | Working directory clean |
| 2 | Current Branch | On main branch |
| 3 | Git Sync | Local in sync with remote |
| 4 | Dependencies | No outdated packages |
| 5 | Security | No vulnerabilities |
| 6 | Linting | ESLint passing |
| 7 | Type Checking | TypeScript compilation |
| 8 | Unit Tests | All tests passing |
| 9 | Build | Extension builds successfully |
| 10 | Package | VSIX creation successful |
| 11 | Version | CHANGELOG updated |
| 12 | Required Files | All present |
| 13 | Package Size | < 50MB |
| 14 | Environment | VSCE_TOKEN set |
| 15 | Documentation | README complete |

**Exit Codes:**
- `0` - All checks passed (or warnings only)
- `1` - Errors found (blocks release)

**Output:**
- ✅ Success messages (green)
- ⚠️ Warning messages (yellow)
- ❌ Error messages (red)
- Summary with counts

---

## 🚀 Release Process

### Standard Release

```bash
# 1. Ensure you're on main branch
git checkout main
git pull origin main

# 2. Bump version
npm run version:bump          # or version:bump:minor / version:bump:major

# 3. Update CHANGELOG.md
# Edit the auto-generated entry with actual changes

# 4. Commit version bump
git add .
git commit -m "chore: bump version to v3.13.0"

# 5. Run pre-release checks
npm run prerelease

# 6. Deploy (if checks pass)
npm run deploy
```

### Emergency Hotfix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug main

# 2. Fix the bug
# Make necessary changes

# 3. Test thoroughly
npm test
npm run test:e2e

# 4. Bump patch version
npm run version:bump

# 5. Update CHANGELOG
# Document the fix

# 6. Commit and deploy
git add .
git commit -m "fix: critical bug in feature X"
npm run deploy
```

### Beta Release

```bash
# 1. Bump version with beta tag
npm version prerelease --preid=beta

# 2. Update CHANGELOG
# Mark as beta release

# 3. Commit changes
git add .
git commit -m "chore: release v3.13.0-beta.1"

# 4. Deploy with beta tag
npm run deploy
```

---

## 🔧 Configuration Files

### GitHub Actions

**Location:** `.github/workflows/`

**Secrets Required:**
```yaml
VSCE_TOKEN: Personal Access Token for VS Code Marketplace
OVSX_TOKEN: Personal Access Token for Open VSX (optional)
SNYK_TOKEN: Snyk API token for security scanning (optional)
SLACK_WEBHOOK: Slack webhook URL (optional)
DISCORD_WEBHOOK: Discord webhook URL (optional)
CODECOV_TOKEN: Codecov API token (optional)
```

**Setup:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add required secrets
3. Configure webhooks for notifications

---

### Playwright

**Location:** `playwright.config.ts`

**Key Settings:**
- Test directory: `tests/e2e`
- Timeout: 60 seconds per test
- Retries: 2 on CI, 0 locally
- Workers: 1 on CI (sequential), unlimited locally
- Reporters: HTML, JSON, JUnit, List
- Browsers: Chromium (VS Code scenarios)
- Screenshots: On failure
- Videos: On failure

**Environment:**
- `CI=true` - Detected automatically on CI
- `PWDEBUG=1` - Enable debug mode

---

### Vitest

**Location:** `vitest.config.ts` (to be created)

**Key Settings:**
- Test pattern: `**/*.{test,spec}.{js,ts}`
- Coverage provider: v8
- Coverage threshold: 75%
- Parallel execution: Yes
- Watch mode: Available

---

## 📈 Monitoring & Reporting

### Codecov Integration

**Coverage Reports:**
- Uploaded automatically from CI
- Visible on PRs with diff coverage
- Historical trend tracking
- Coverage badges for README

**Setup:**
1. Sign up at codecov.io
2. Add repository
3. Copy token to GitHub secrets
4. Badge: `[![codecov](https://codecov.io/gh/USER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/USER/REPO)`

---

### Performance Tracking

**Metrics Collected:**
- Extension load time
- UI render time
- Search response time
- AI response latency
- Memory usage
- File operation speed

**Storage:**
- `performance-results.json` - Latest results
- `performance-results/{timestamp}.json` - Historical data

**Analysis:**
- Automatic PR comments
- Trend visualization (future)
- Regression alerts (future)

---

### Error Tracking

**Recommendation:** Sentry or similar

**Integration Points:**
- Extension activation
- Tool execution errors
- API failures
- Uncaught exceptions

**Setup:** (Future work)
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
});
```

---

## 🛡️ Security

### Vulnerability Scanning

**Automated:**
- npm audit (every CI run)
- Snyk security scan (every CI run)
- Dependabot alerts (GitHub)

**Manual:**
```bash
npm audit
npm audit fix
npm audit fix --force  # Use with caution
```

### Dependency Updates

**Automated:**
- Dependabot PRs (weekly)
- Automated merging for patch updates (optional)

**Manual Review Required:**
- Major version updates
- Security-critical packages
- Breaking changes

---

## 📝 Documentation

### Required Files

1. **README.md** - Project overview and quick start
2. **CHANGELOG.md** - Version history and changes
3. **LICENSE** - MIT license
4. **CONTRIBUTING.md** - Contribution guidelines (future)
5. **CODE_OF_CONDUCT.md** - Community guidelines (future)

### API Documentation

**Location:** `docs/api/` (future)

**Tools:** TypeDoc

**Generation:**
```bash
npm run docs:generate  # Future script
```

---

## 🎯 Best Practices

### Commit Messages

**Format:**
```
type(scope): subject

body

footer
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes

**Examples:**
```
feat(chat): add streaming response support

Implement server-sent events for real-time AI responses.
Includes progress indicators and cancellation support.

Closes #123
```

```
fix(auth): handle expired token gracefully

Previously, expired tokens would cause extension crash.
Now shows login prompt and preserves user context.

Fixes #456
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

4. **Push to Remote**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Create Pull Request**
   - Describe changes
   - Reference issues
   - Request reviews
   - Wait for CI checks

6. **Address Feedback**
   - Make requested changes
   - Push updates
   - Respond to comments

7. **Merge**
   - Squash and merge (preferred)
   - Delete branch

### Testing Guidelines

**Unit Tests:**
- Test one thing per test
- Use descriptive names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for 75%+ coverage

**E2E Tests:**
- Test user journeys
- Use page objects
- Avoid hard-coded waits
- Clean up after tests
- Test happy and error paths

**Performance Tests:**
- Baseline measurements
- Consistent test environment
- Multiple iterations
- Statistical significance
- Document expectations

**Accessibility Tests:**
- Automated scanning
- Manual keyboard testing
- Screen reader testing
- Color contrast validation
- Focus management

---

## 🔄 Continuous Improvement

### Future Enhancements

1. **Visual Regression Testing**
   - Percy or Chromatic integration
   - Screenshot comparison
   - Pixel-perfect UI validation

2. **Load Testing**
   - K6 or Artillery
   - Stress test API endpoints
   - Concurrent user simulation

3. **Mutation Testing**
   - Stryker integration
   - Test suite quality validation
   - Coverage effectiveness

4. **Semantic Release**
   - Automated version bumping
   - Changelog generation
   - Release note creation

5. **Preview Deployments**
   - Deploy PRs to preview environment
   - Ephemeral test instances
   - Easy stakeholder review

6. **Monitoring Dashboard**
   - Real-time metrics
   - Error rates
   - User analytics
   - Performance trends

---

## 🆘 Troubleshooting

### Common Issues

#### **CI Fails on E2E Tests**

**Symptoms:** Playwright tests timeout or fail on CI but pass locally

**Solutions:**
1. Check browser installation: `npx playwright install --with-deps`
2. Increase timeout: Update `playwright.config.ts`
3. Add explicit waits: `await page.waitForSelector()`
4. Check CI logs for specific errors
5. Run locally with CI environment: `CI=true npm run test:e2e`

#### **Performance Tests Fail Inconsistently**

**Symptoms:** Benchmarks pass sometimes, fail other times

**Solutions:**
1. Increase target thresholds slightly
2. Run multiple iterations and average
3. Use dedicated CI runners (no shared resources)
4. Account for cold start vs. warm start
5. Disable background processes during tests

#### **Deployment Fails with 401 Unauthorized**

**Symptoms:** `vsce publish` fails with authentication error

**Solutions:**
1. Verify VSCE_TOKEN is set: `echo $VSCE_TOKEN`
2. Check token hasn't expired
3. Regenerate token: https://dev.azure.com
4. Ensure token has `Marketplace (Publish)` scope
5. Update GitHub secret

#### **Package Size Too Large**

**Symptoms:** VSIX exceeds 50MB limit

**Solutions:**
1. Check `.vscodeignore` includes build artifacts
2. Remove unnecessary files: `dist/`, `node_modules/`
3. Optimize images with Sharp or similar
4. Use webpack bundle analyzer
5. Review large dependencies

---

## 📞 Support

### Getting Help

**Documentation:**
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Playwright Docs](https://playwright.dev)
- [Vitest Docs](https://vitest.dev)
- [GitHub Actions Docs](https://docs.github.com/actions)

**Community:**
- GitHub Discussions
- Stack Overflow (tag: `vscode-extension`)
- VS Code Extension Community Discord

**Issues:**
- Bug reports: GitHub Issues
- Feature requests: GitHub Discussions
- Security vulnerabilities: security@oropendola.ai

---

## ✅ Checklist for New Contributors

- [ ] Read this document thoroughly
- [ ] Set up development environment
- [ ] Run tests locally: `npm test && npm run test:e2e`
- [ ] Make small test change and verify CI passes
- [ ] Review existing PR for workflow example
- [ ] Ask questions in GitHub Discussions

---

**Last Updated:** 2025-11-01
**Version:** 1.0.0
**Maintained By:** Oropendola Team
