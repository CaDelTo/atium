<!--
Template for a rule page (09-documentation.md, "Reglas"; ADR-0023, section 4).
Copy it to docs/rules/<code in lowercase>.md, such as docs/rules/e2e001.md,
replace every <placeholder> and delete this comment. Keep the five "##"
sections and their titles: a test checks them. Write in English (ADR-0020).
-->

# <CODE>: <short title>

| ESLint name                                | Severity                    | Category   | Confidence                | Source              | Presets                 |
| ------------------------------------------ | --------------------------- | ---------- | ------------------------- | ------------------- | ----------------------- |
| `atium/<rule-name>`, or "— (cross-file)"   | <error, warning or info>    | <category> | <high, medium or low>     | <rule or heuristic> | <recommended, strict>   |

The values come from the rule catalogue (03-linter.md §11.8).

## What it detects

<One paragraph on what the rule reports, and what it does not report to avoid false positives.>

## Why it is a problem

<How the pattern makes the suite flaky, slow or hard to maintain.>

## Examples

### Incorrect

```ts
<code that the rule reports>
```

### Correct

```ts
<the same code, fixed>
```

## Options

<The rule options with their defaults, and the `settings.atium` keys it reads; or "This rule has no options.">

## When to disable it

<Cases where the pattern is reasonable, and how to disable the rule for one line or file.>
