# ADR-0021: TypeScript 6 mientras el toolchain no soporte TypeScript 7

- Estado: Aceptada
- Fecha: 2026-10-09
- Diseño relacionado: 17-tech-stack.md, 10-tooling.md (estándar)

## Contexto

La regla del proyecto es fijar cada dependencia en su última versión estable. La última de TypeScript es 7.0.2, la versión nativa (compilador en Go). Su paquete npm ya no expone la API JS del compilador: `exports["."]` solo apunta a `lib/version.cjs`, y el resto está bajo `unstable/*`.

Dos herramientas del stack usan esa API:

- tsup ([ADR-0001](0001-monorepo-pnpm-turborepo.md)) genera las declaraciones de tipos (`.d.ts` y `.d.cts`) con ella.
- typescript-eslint, que llega en v0-03 ([ADR-0014](0014-estandares-ingenieria.md)), la usa para las reglas con información de tipos.

La tarea v0-02 necesita generar declaraciones, así que la incompatibilidad apareció al crear `packages/core`. El usuario decidió quedarse en TypeScript 6.

## Decisión

- TypeScript se fija en la serie 6.x (hoy 6.0.3), como excepción a "última versión estable".
- tsup fuerza `baseUrl` en su build de declaraciones, y TypeScript 6 lo rechaza por obsoleto. Cada `tsup.config.ts` usa `dts.compilerOptions.ignoreDeprecations: "6.0"`, acotado a ese build. El `tsconfig.json` de los paquetes no silencia nada.
- Se pasa a TypeScript 7 cuando tsup (o la herramienta que lo reemplace) y typescript-eslint lo soporten.

## Consecuencias

- Las herramientas del stack funcionan sin cambios ni capas extra.
- El proyecto no aprovecha la velocidad del compilador nativo en `typecheck`.
- `ignoreDeprecations: "6.0"` es un parche temporal que hay que quitar al migrar.
- Renovate propondrá TypeScript 7; hay que rechazarlo o fijar la serie en su configuración (v0-03 o v0-04).

## Alternativas descartadas

- TypeScript 7 para `typecheck` y TypeScript 6 solo para tsup y typescript-eslint: dos versiones del compilador en el repositorio pueden dar diagnósticos distintos y complican la configuración.
- Reemplazar tsup por una herramienta compatible con TypeScript 7 (por ejemplo, tsdown): contradice ADR-0001 y no resuelve typescript-eslint.
- Generar las declaraciones con `tsc` por separado: con TypeScript 7 seguiría faltando la API JS para typescript-eslint.
