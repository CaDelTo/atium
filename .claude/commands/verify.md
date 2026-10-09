---
description: Ejecuta pnpm verify mediante el subagente verifier y muestra el resumen
argument-hint: "[paquete opcional]"
---

Usa el subagente `verifier` para ejecutar la verificación. Si recibes `$ARGUMENTS`, limita la verificación a ese paquete con `--filter`.

Muestra su resumen tal cual. Si falla, propone el orden en que conviene arreglar los problemas (primero tipos, luego lint, luego tests), sin empezar a arreglarlos.
