# ADR-0002: TypeScript, ESM primero y Node.js 22+

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 01-requirements.md, 17-tech-stack.md

## Contexto

Playwright y Cypress viven en el ecosistema JavaScript/TypeScript. Las configuraciones de los usuarios mezclan ESM y CJS.

## Decisión

- Todo el código en TypeScript estricto (`strict: true`, sin `any` implícito).
- ESM como formato principal; adapters y reporters también se publican en CJS.
- Node.js 22 LTS como mínimo (Node 20 llegó a fin de soporte en abril de 2026); CI prueba 22 y 24.

## Consecuencias

- Compatibilidad con la mayoría de configuraciones de Playwright y Cypress.
- Doble publicación ESM/CJS en los paquetes que cargan los frameworks.

## Alternativas descartadas

- Solo CJS: contrario a la dirección del ecosistema.
- Solo ESM: rompe configuraciones existentes en CJS.
