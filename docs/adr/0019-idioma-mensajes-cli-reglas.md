# ADR-0019: Mensajes del CLI, de las reglas y de los reportes en inglés

- Estado: Aceptada
- Fecha: 2026-10-09
- Diseño relacionado: 18-cli-config.md, 03-linter.md, 13-score-baseline-reports.md, 23-risks-open-decisions.md

## Contexto

El idioma de los mensajes del CLI, de las reglas y de la documentación pública era una decisión abierta (diseño, sección 31). El CLI (v0-17), las reglas y los reportes necesitan textos definitivos.

Las herramientas del ecosistema (Playwright, Cypress, ESLint) usan inglés, y el código, los identificadores y los commits de Atium ya están en inglés (ADR-0014).

## Decisión

- Todo lo que Atium muestra al usuario va en inglés:
  - mensajes del CLI: salida, ayuda, errores y sus `hint`;
  - mensajes de las reglas: `meta.messages` del plugin de ESLint y los textos de los Findings;
  - reportes: consola, HTML, JSON y SARIF;
  - comentarios en PR de la GitHub Action.
- Los textos del CLI se centralizan en `packages/cli/src/messages.ts`.
- La documentación pública queda pendiente, incluidas las páginas de documentación de cada regla.

## Consecuencias

- La salida es coherente con las herramientas que el usuario ya conoce, y los mensajes se pueden buscar en internet.
- Los tests que comprueban mensajes los esperan en inglés.
- Centralizar los textos facilita revisarlos y permitiría traducirlos más adelante, aunque eso no se planea.
- Los usuarios que no leen inglés no tienen mensajes en su idioma.

## Alternativas descartadas

- Mensajes en español: reduce el público de una herramienta open source y la aleja del ecosistema.
- CLI bilingüe desde el inicio: duplica el costo de cada mensaje y de sus tests sin que nadie lo haya pedido.
