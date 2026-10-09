# ADR-0014: Estándares de ingeniería aplicados por herramientas

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: docs/engineering/

## Contexto

El proyecto se desarrolla con ayuda de agentes de código (Claude Code). Las reglas escritas solo en prosa se aplican de forma inconsistente entre sesiones; las que verifica una herramienta se cumplen siempre.

## Decisión

- Los estándares viven en `docs/engineering/` y tienen precedencia por debajo de los ADRs y del diseño.
- Todo estándar verificable se aplica con una herramienta dentro de `pnpm verify`: TypeScript estricto, typescript-eslint con reglas type-aware, Prettier, dependency-cruiser para capas, knip para código sin usar, umbrales de cobertura en Vitest.
- Código, identificadores, comentarios y commits en inglés; documentos de diseño y ADRs en español.
- Conventional Commits con el paquete como scope.

## Consecuencias

- `pnpm verify` es la definición mecánica de "terminado"; la revisión humana se concentra en lo que las herramientas no ven (diseño, fórmulas, tests significativos).
- Más configuración inicial en V0.
- Algunas reglas (complejidad, tamaño de funciones y archivos) son avisos para no bloquear casos justificados.

## Alternativas descartadas

- Estándares solo en prosa: se aplican de forma irregular.
- Biome en lugar de ESLint + Prettier: no tiene reglas con información de tipos equivalentes, y el proyecto ya depende de ESLint como producto.
