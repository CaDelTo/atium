# Riesgos y decisiones abiertas

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 31. Riesgos y decisiones abiertas

| Riesgo | Mitigación |
|---|---|
| Alcance de varios productos en uno | Fases usables por sí solas; API de plugins para contribuciones |
| Atium rompe la suite de un usuario | Fail-open en todas las capas, verificado con inyección de fallos |
| Falsos positivos de flaky | Evidencia por tipo, estados `suspected`/`broken`, intervalos de confianza, pruebas estadísticas |
| Clasificación de triage incorrecta | Reglas configurables, confianza explícita, evidencia visible, `unknown` antes que adivinar |
| Score percibido como arbitrario | Fórmula publicada, pesos configurables, foco en deltas |
| Volumen de historial | Niveles raw / rollups / stats y retención |
| Escrituras concurrentes | Archivos inmutables + compactación idempotente |
| Datos sensibles capturados | Sin cuerpos ni headers por defecto, redacción, sin telemetría |
| Sugerencias de selector que ocultan regresiones | Solo sugerencias, revisión humana |
| `testId` inestable al renombrar tests | Detección de renombres con Git y similitud de títulos |
| Cambios en APIs de Playwright / Cypress | Matriz de compatibilidad y fixtures por versión |
| Costo de chaos y coverage | Local o nightly, límite de escenarios |

Decisiones pendientes:

- Nombre del proyecto
- Backend remoto recomendado por defecto (S3 o rama git)
- Licencia (MIT o Apache-2.0)
- Idioma de los archivos para contribuidores (`CONTRIBUTING.md`, plantillas de issues, código de conducta). Los mensajes del CLI y de las reglas, los reportes y los comentarios en PR van en inglés ([ADR-0019](../adr/0019-idioma-mensajes-cli-reglas.md)), igual que la documentación pública, incluidas las páginas de cada regla ([ADR-0020](../adr/0020-idioma-documentacion-publica.md)).
- Versiones mínimas definitivas de Playwright, Cypress y herramientas BDD
