# terminalText y caracteres invisibles

- ID: v1-61-terminal-text-invisibles
- Fase: V1
- Paquete: packages/cli
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 16

## Contexto

Diseño: docs/design/20-security-privacy.md
ADRs: ninguno
Estándares: docs/engineering/06-security.md

- `terminalText` (`terminal-text.ts:8`) escapa los caracteres de control y los de dirección bidi, pero deja pasar:
  - las marcas LRM, RLM y ALM (U+200E, U+200F, U+061C);
  - los caracteres de ancho cero (U+200B a U+200D) y U+FEFF;
  - las etiquetas Unicode (U+E0000 a U+E007F).
- Un valor como `atium --format $'\u{E0041}x'` se muestra en el error de uso como `x`, con texto oculto.

## Hacer

- Agregar esos rangos a la clase de caracteres que se escapan.
- Tests de cada rango.

## Criterios de aceptación

- Cada carácter de los rangos de la sección Contexto sale escapado en `terminalText`.
- El texto normal, incluidos acentos y emojis, sale igual.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Normalización Unicode del texto.
