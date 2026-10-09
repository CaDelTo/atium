# ADR-0001: Monorepo con pnpm workspaces y Turborepo

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 16-repository-structure.md, 17-tech-stack.md

## Contexto

La plataforma tiene muchas piezas independientes (core, CLI, plugin de ESLint, adapters, analizadores, backends de storage, reporters). Los usuarios deben poder instalar solo lo que usan, y las piezas deben evolucionar con versiones propias.

## Decisión

- Un único repositorio con un paquete npm por pieza bajo `packages/`.
- pnpm workspaces para dependencias, Turborepo para builds y tests incrementales con caché.
- tsup para compilar; Changesets para versionado y publicación independiente.
- Scope npm provisional: `@atium/*`.

## Consecuencias

- Cambios que tocan varios paquetes se hacen en un solo PR.
- Hay que mantener la configuración de Turborepo y Changesets.
- Al inicio solo existen `core`, `cli` y `adapters/playwright`; el resto se crea por fase.

## Alternativas descartadas

- Un solo paquete con todo: obliga a instalar dependencias pesadas que el usuario no usa.
- Varios repositorios: dificulta cambios coordinados en el modelo de datos.
- Nx: más potente pero más complejo de lo necesario.
