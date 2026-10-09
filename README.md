# Atium

Open source quality analysis platform for automated test suites (Playwright,
Cypress, Cucumber). It helps QA engineers write better tests and keep their
suites healthy: linting, selectors, failure triage, flaky tests, network, coverage
gaps and prioritization.

"Atium" is a provisional codename ([ADR-0016](docs/adr/0016-codename-atium.md)).
Nothing is published to npm under this name.

## Status

Pre-alpha. The project is in phase V0 (foundations); there is no usable package
yet. See the [roadmap](docs/design/22-roadmap.md) and the
[task list](docs/tasks/README.md).

## Development

Requires Node.js 22 or later (see `.nvmrc`) and pnpm 12 (the exact version is in
the `packageManager` field of `package.json`).

```sh
pnpm install
pnpm build
```

## Documentation

- [Design](docs/design/README.md)
- [Architecture decision records](docs/adr/README.md)
- [Engineering standards](docs/engineering/README.md)
- [Tasks](docs/tasks/README.md)

The design documents and ADRs are currently written in Spanish.

## License

Not decided yet.
