# Avisos de seguridad en zod, vitest y fast-uri

- ID: v1-45-dependency-advisories-zod-vitest
- Fase: V1
- Paquete: raíz del monorepo (`package.json`, `pnpm-lock.yaml`), `packages/core`, `packages/cli`, `packages/eslint-plugin`, `packages/storage/sqlite` y `examples/playwright-demo`
- Depende de: ninguna
- Origen: el job `audit` de CI falló en el PR #112 (run 41729970129) por avisos publicados después del último verde de `main` (72f6d5e, 2026-10-22). Mismo caso que v1-01 y #105. v1-43 y v1-44 ya están reservadas en el PR #112.

## Contexto

- Estándares: docs/engineering/06-security.md (sección Dependencias) y docs/engineering/10-tooling.md.
- Diseño: docs/design/17-tech-stack.md.
- ADRs: ninguno.
- El job `audit` de `.github/workflows/verify.yml` ejecuta `pnpm audit --audit-level high` y bloquea solo en high o critical.
- `pnpm audit` en `main` muestra 8 avisos: 1 high, 5 moderate y 2 low.

## Hacer

- **`zod` (high, GHSA-mrhx-c7xc-m3w5):**
  - Afecta a <4.6.6.
  - Pasar el pin de 4.6.5 a 4.6.6 en `packages/core`, `packages/cli`, `packages/eslint-plugin`, `packages/storage/sqlite` y `examples/playwright-demo`.
  - `knip` también la trae como transitiva (`^4.4.3`): se resuelve a la misma 4.6.6 en el lockfile.
  - La 4.6.6 se publicó el 2026-10-11.
- **`@vitest/mocker` (2 moderate):**
  - Afecta a <5.0.3.
  - Pasar `vitest` y `@vitest/coverage-v8` de 5.0.2 a 5.0.3 en todos los `package.json` que los pinean.
  - La 5.0.3 se publicó el 2026-09-30.
  - vitest 5.0.3 pinea `why-is-node-running` a 3.2.1 exacta, así que el lockfile la baja desde la 3.2.2. No es una regresión.
- **`fast-uri` (2 moderate y 2 low):**
  - Afecta a <3.1.9.
  - Es transitiva: la trae `@commitlint/cli` a través de `ajv`, que declara `^3.0.1`.
  - Subirla a 3.1.9 solo en el lockfile, sin `overrides`.
  - La 3.1.9 se publicó el 2026-10-19.
- **Versión elegida:** la mínima parcheada. Las versiones más nuevas quedan fuera de alcance.
  - 17-tech-stack.md pide fijar la última versión estable, pero un parche de seguridad mueve solo lo necesario, como en v1-01: subir más es "actualizar dependencias sin avisos".
  - Las últimas elegibles (zod 4.6.7 y vitest 5.0.5) se pueden subir en otra tarea.

## Criterios de aceptación

- `pnpm audit --audit-level high` sale con 0 y el job `audit` de CI pasa.
- `pnpm audit` no muestra avisos de zod, @vitest/mocker ni fast-uri.
- `pnpm pkg:check` pasa
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- **`minimatch` (moderate, GHSA-g3hv-75wg-m249):**
  - Afecta a <11.0.1, que es un salto de major.
  - En el árbol hay dos versiones:
    - 3.1.5, vía `eslint`, `@eslint/eslintrc` y `@eslint/config-array`, que declaran `^3.1.5`.
    - 10.2.6, vía `@typescript-eslint/typescript-estree` y `eslint-plugin-sonarjs`, que declaran `^10`.
  - No hay parche en las series 3.x ni 10.x, y ningún padre declara `^11`.
  - La 11.0.1 (2026-10-27) no cumple `minimumReleaseAge` hasta el 2026-11-10T22:26Z.
  - **Decisión de la persona (2026-11-03): esperar sin cambiar la configuración.** Al ser moderate, no bloquea el job `audit`.
  - Se revisa cuando la 11.0.1 cumpla los 14 días o cuando algún padre declare `^11`.
- Actualizar dependencias sin avisos de seguridad.
- Añadir un changeset: los paquetes son privados y nunca se han publicado.
