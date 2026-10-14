# Playwright demo

A small Playwright suite with deliberate problems. Every seeded problem is listed in
[`expected-findings.json`](expected-findings.json), the source of truth of the linter
acceptance tests: `atium lint` must report exactly those findings, no more and no fewer.

The tests are only read by the linter; there is no app to run them against yet.

From the repository root:

```sh
pnpm --filter @atium/example-playwright-demo test       # checks expected-findings.json
pnpm --filter @atium/example-playwright-demo typecheck  # the demo and verify/ compile
```

## Layout

| Path | Contents |
|---|---|
| `tests/*.spec.ts` | Playwright tests |
| `tests/pages/` | Page Objects (`pageObjectDirs`) |
| `tests/helpers/` | Shared helpers imported by the tests |
| `expected-findings.json` | Every expected finding, ordered by `file`, `line` and `ruleId` |
| `verify/` | Checks of `expected-findings.json`; not part of the demo suite |

## Configuration the expected findings assume

The demo has no `eslint.config.js` or `atium.config` yet: the acceptance test of `atium lint`
(task v1-38) adds them with these settings.

- ESLint with the `strict` preset of `@atium/eslint-plugin`, so that E2E004 and E2E005 run.
- `settings.atium.pageObjectDirs: ["tests/pages/**"]`.
- `analyzers["lint-crossfile"].rules: { E2E011: "on", E2E013: "on" }`, since both are off by default.

## Seeded problems

| File | Line | Rule | Problem |
|---|---|---|---|
| `tests/cart.spec.ts` | 12 | E2E013 | Same action sequence as "adds a book to the cart" |
| `tests/checkout.spec.ts` | 11 | E2E003 | Positional XPath `//div[2]/button` |
| `tests/checkout.spec.ts` | 18 | E2E004 | `.nth(2)` on a CSS locator |
| `tests/checkout.spec.ts` | 20 | E2E007 | `#promo-banner`, also in `login.spec.ts` and `profile.spec.ts` |
| `tests/checkout.spec.ts` | 24 | E2E012 | High-entropy literal assigned to `apiKey` |
| `tests/helpers/navigation.ts` | 8 | E2E011 | `resetFilters` is exported and never used |
| `tests/login.spec.ts` | 20 | E2E001 | `page.waitForTimeout(2000)` |
| `tests/login.spec.ts` | 21 | E2E009 | `expect(await …isVisible()).toBe(true)` |
| `tests/login.spec.ts` | 22 | E2E007 | `#promo-banner` (see above) |
| `tests/orders.spec.ts` | 4 | E2E008 | `test.describe.serial` |
| `tests/orders.spec.ts` | 11 | E2E006b | Only calls an imported helper with no assertions |
| `tests/pages/login-page.ts` | 12 | E2E002 | `:nth-child` in a Page Object, reported once at its definition |
| `tests/pages/login-page.ts` | 26 | E2E011 | Page Object method `logout` is never used |
| `tests/profile.spec.ts` | 8 | E2E005 | 26 actions in one test (limit 25) |
| `tests/profile.spec.ts` | 43 | E2E007 | `#promo-banner` (see above) |
| `tests/profile.spec.ts` | 46 | E2E006 | Actions and no assertions |
| `tests/search.spec.ts` | 4 | E2E010 | `test.only` |

## Cases that must not be reported

| File | Case | Rule it must not trigger |
|---|---|---|
| `tests/checkout.spec.ts` | XPath by attribute `//button[@data-testid='pay']` | E2E003 |
| `tests/checkout.spec.ts` | XPath strings in `locator()`, which are not CSS | E2E002 |
| `tests/checkout.spec.ts` | `.nth(1)` on `getByRole` with a name | E2E004 |
| `tests/checkout.spec.ts` | `password = "password123"`, an obviously fake value | E2E012 |
| `tests/search.spec.ts`, `tests/orders.spec.ts` | `#help-link` repeated in only 2 files | E2E007 |
| `tests/profile.spec.ts` | Assertion inside a helper of the same file | E2E006 |
| `tests/login.spec.ts` | Only assertion in an imported helper, 2 levels deep ("signs in with valid credentials") | E2E006, E2E006b |
| `tests/home.spec.ts`, `tests/pages/cart-page.ts`, `tests/helpers/assertions.ts` | No problems at all | Any |

Cypress cases, such as `cy.wait("@alias")`, belong in a Cypress demo.

## Conventions of `expected-findings.json`

Some details are decided by the task that implements each rule. That task updates this file in
the same change if it decides otherwise.

- `file` is relative to this directory.
- `line` is the line of the node that causes the problem. For rules about a whole test
  (E2E005, E2E006, E2E006b, E2E013), it is the line of the `test(` call.
- `titlePath` holds the titles of the test that contains the finding, and is empty outside a test.
- E2E007 reports each use of the repeated selector outside `pageObjectDirs`.
- E2E013 reports each pair once, on the second test.
- A test whose only possible assertions are in imported helpers is decided by E2E006b, not
  E2E006. A test with no assertions and no imported helpers is reported by E2E006 only, never
  also by E2E006b (`tests/profile.spec.ts:46`).

When a test file changes, update the lines here and in `expected-findings.json`; `pnpm test`
checks that every finding points at an existing, non-blank line and that its `titlePath` is
the one of the test that contains that line.
