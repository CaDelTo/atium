---
description: Revisión completa de los cambios actuales con subagentes en paralelo
argument-hint: "[ref base, por defecto main]"
---

Revisa los cambios actuales contra el ref `$ARGUMENTS`. Si está vacío, usa `main`.

1. Obtén los archivos cambiados con `git diff --name-only` contra ese ref.
2. Lanza en paralelo, pasando a cada uno el ref y la lista de archivos:
   - `code-reviewer`
   - `duplication-auditor`
   - `docs-checker`
   - `security-reviewer`, solo si cambian archivos en packages/storage, packages/adapters, packages/cli, packages/reporters, packages/core/src/redact, packages/github-action o .github/
   - `design-auditor`, solo si cambian archivos `defaults.ts`, packages/core/src/scoring, packages/core/src/fingerprint o packages/analyzers
   - `perf-benchmarker`, solo si cambian archivos en packages/adapters, packages/storage, packages/suite-index, packages/cli o carpetas `bench/`
3. Consolida un solo reporte con el formato de docs/engineering/11-code-review.md, sin duplicar hallazgos que reporten varios agentes.
4. Verifica tú mismo cada hallazgo bloqueante abriendo el código antes de incluirlo; descarta los que no se sostengan.
5. No corrijas nada todavía. Termina preguntando qué hallazgos corregir.
