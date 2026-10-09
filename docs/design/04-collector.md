# Execution Collector

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 12. Execution Collector

### 12.1 Playwright

Dos piezas:

- **Reporter** (`@atium/playwright/reporter`): usa la Reporter API (`onBegin`, `onTestEnd`, `onEnd`) para resultados, intentos, `workerIndex`, orden de ejecución y errores. En `onEnd` escribe el run en `.atium/runs/<runId>.ndjson.gz`.
- **Fixture** (`@atium/playwright/fixture`): extiende `test` con un fixture automático que, por contexto de navegador:
  - Escucha `request`, `requestfinished` y `requestfailed` para el resumen de red.
  - Escucha `console` y `pageerror`.
  - Al fallar un intento, captura `ariaSnapshot` del body (si la versión lo soporta).
  - Envía los datos al reporter mediante attachments del test (`testInfo.attach`) con un tipo propio, que el reporter consume y no se muestran en el reporte HTML de Playwright.

```ts
// playwright.config.ts
export default defineConfig({
  reporter: [["html"], ["@atium/playwright/reporter"]],
});

// tests/fixtures.ts
import { test as base } from "@playwright/test";
import { withAtium } from "@atium/playwright/fixture";
export const test = withAtium(base);
```

Sin el fixture, el reporter igual funciona: se pierden red, consola y snapshots, pero historial, flaky y triage básico siguen disponibles.

### 12.2 Cypress

- Plugin en `setupNodeEvents` para resultados por spec (`after:spec`, `after:run`), incluyendo intentos.
- Archivo de soporte que registra un `cy.intercept` pasivo (solo observa, nunca modifica respuestas) y escucha `uncaught:exception` sin alterar su comportamiento.

### 12.3 Ingesta genérica

`atium ingest --format junit|ctrf <archivo>` para cualquier otro framework. Provee historial, flaky (si el formato incluye reintentos) y triage básico por mensaje de error; sin red ni DOM.

### 12.4 Captura de red

| Aspecto | Comportamiento por defecto |
|---|---|
| Qué se guarda | Método, URL normalizada, host, status, fallo, timing. **Sin cuerpos ni headers** |
| Detalle completo (`calls`) | Solo para intentos fallidos; el resto queda como resumen por endpoint |
| Hosts | Solo el host de `baseURL` y los configurados en `network.hosts`; el resto se agrega como "third-party" y se excluye de las correlaciones |
| GraphQL | Para endpoints en `network.graphqlEndpoints`, se lee `operationName` del cuerpo y se descarta el resto |
| WebSockets / SSE | Fuera de alcance inicial |

**Normalización de URLs (`urlTemplate`):**

1. Si hay especificación OpenAPI, se hace match contra sus path templates (`/api/orders/{id}`), respetando `servers` / base path.
2. Si no, heurística por segmento: numéricos, UUID, hex ≥ 8 caracteres y tokens base64 largos se reemplazan por `{id}`.
3. Se descarta el query string (opcionalmente se conservan las claves ordenadas).

### 12.5 Fail-open

- Toda la lógica del reporter y del fixture está envuelta en manejo de errores: un fallo interno escribe un aviso y continúa.
- El fixture nunca lanza excepciones hacia el test ni modifica su resultado.
- Si el overhead medido supera el presupuesto ([sección 7](01-requirements.md)), se desactiva la captura de red para ese run con un aviso.
- Tests automatizados verifican este comportamiento inyectando fallos ([sección 29](21-testing-strategy.md)).
