# Test Gap Analysis

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 18. Test Gap Analysis

Responde **"¿qué no estoy probando?"** con datos que Atium ya captura. Reemplaza al mutation testing de la versión 1.

### 18.1 Endpoints sin probar

Compara la especificación OpenAPI con los `urlTemplate` observados en los últimos 30 días (match por método + path template, respetando `servers` y base path):

```
API coverage by E2E tests: 41 / 60 operations

Never called by any test:
  DELETE /api/orders/{id}
  PATCH  /api/users/{id}/password
  POST   /api/refunds
```

Para GraphQL, la unidad es la operación (`operationName`) contra la lista de operaciones del esquema o un archivo de operaciones persistidas.

### 18.2 Respuestas nunca probadas

```
POST /api/payment
  Observed in tests:  200
  Declared in spec:   200, 400, 402, 500
  Never observed:     400, 402, 500   → candidatos para chaos o tests negativos
```

### 18.3 Rutas sin visitar

Compara las rutas de la app con las URLs de navegación observadas (`page.goto`, cambios de URL del frame principal). Fuentes de rutas, en orden de preferencia:

1. Lista en configuración (`gaps.routes`)
2. Manifest del router (Next.js, React Router), mediante plugins
3. `sitemap.xml`

### 18.4 Mutation testing (opcional)

Para tests unitarios o de integración, Atium puede ejecutar **Stryker** e ingerir su reporte JSON, cruzándolo con los gaps anteriores. No es parte del núcleo.
