---
description: Auditoría periódica de todo el repositorio (duplicación, código muerto, smells, conformidad con el diseño)
---

Auditoría completa del repositorio, no solo del diff.

1. Lanza en paralelo:
   - `duplication-auditor` sobre `packages/`
   - `design-auditor` sobre todos los `defaults.ts` y los paquetes de packages/analyzers
   - `docs-checker` sobre todos los exports públicos
2. Consolida los hallazgos por paquete, ordenados por severidad.
3. Agrupa los que conviene resolver juntos y propone tareas concretas (una por grupo), en el formato de docs/tasks/.
4. No cambies código.
