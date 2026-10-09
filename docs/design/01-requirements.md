# Requisitos no funcionales y compatibilidad

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 7. Requisitos no funcionales

| Requisito | Objetivo inicial |
|---|---|
| Overhead del reporter | ≤ 3% del tiempo total de la suite |
| Overhead del fixture por test | ≤ 20 ms sin captura de traces |
| Lint de 1,000 archivos de test | < 20 s en frío, < 3 s con caché |
| `analyze` sobre 30 días de historial (5,000 tests) | < 15 s |
| Tamaño de un run (1,000 tests, sin fallos) | ≤ 1 MB comprimido |
| Reporte HTML (5,000 tests) | ≤ 5 MB, un solo archivo |
| Descarga de historial en CI | ≤ 20 MB por defecto (rollups, [sección 23](15-storage.md)) |
| Uploads y descargas | Timeout de 10 s; si fallan, se omite con aviso |
| Errores internos | Fail-open: aviso en consola, sin afectar resultados (exit codes, [sección 26.2](18-cli-config.md)) |
| Funcionamiento offline | Todo excepto storage remoto y LLM |
| Determinismo | Misma entrada → mismos Findings y score |

---

## 8. Compatibilidad

| Componente | Versión mínima propuesta | Notas |
|---|---|---|
| Node.js | 22 LTS | Node 20 llegó a fin de soporte en abril de 2026. CI prueba 22 y 24, y las LTS nuevas cuando salgan |
| Playwright | 1.45 | `ariaSnapshot` requiere 1.49; si no está, el Selector Advisor degrada a datos de traces |
| Cypress | 13 | |
| ESLint | 9 (flat config) | Sin soporte para `.eslintrc` legacy |
| TypeScript | 5.0 | Proyectos JS soportados; las reglas type-aware se desactivan sin `tsconfig` |
| Cucumber | cucumber-js y playwright-bdd recientes | Versiones exactas a definir en la fase BDD |
| Sistemas operativos | Linux, macOS, Windows | Rutas normalizadas a formato POSIX relativo a la raíz del repo |
| Módulos | ESM primero | Adapters y reporters publicados también en CJS por compatibilidad con configs existentes |

Cada analizador declara qué datos requiere. Si el adapter no los provee (por ejemplo, red con ingesta JUnit), el analizador se omite con un aviso en vez de fallar.
