---
description: Crea un ADR nuevo a partir de la plantilla
argument-hint: "<título de la decisión>"
---

Crea un ADR para: $ARGUMENTS

1. Busca el número siguiente en docs/adr/.
2. Copia docs/adr/0000-template.md a `docs/adr/NNNN-<titulo-en-kebab-case>.md` con estado `Propuesta` y la fecha de hoy.
3. Completa contexto, decisión, consecuencias y alternativas a partir de esta conversación. Lo que no esté claro, márcalo como `PENDIENTE:` en lugar de inventarlo.
4. Si reemplaza un ADR anterior, indícalo y propone el cambio de estado del anterior.
5. Agrega la fila al índice docs/adr/README.md.
6. No cambies código en este comando.
