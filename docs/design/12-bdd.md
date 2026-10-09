# Higiene BDD

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 20. Higiene BDD (Cucumber)

Cucumber corre encima de otro runner, así que es una **capa de metadatos** que agrega feature → scenario → step a cada resultado.

### 20.1 Fuentes

- **Cucumber Messages** (NDJSON) de cucumber-js
- **playwright-bdd**: los tests generados conservan la relación con feature y escenario
- Archivos `.feature` parseados con `@cucumber/gherkin` para análisis estático

### 20.2 Análisis determinístico

| Código | Regla |
|---|---|
| BDD001 | Step sin definición |
| BDD002 | Step definition sin usar |
| BDD003 | Expresiones ambiguas (un step coincide con más de una definición) |
| BDD004 | Escenarios casi idénticos (misma similitud que E2E013) |
| BDD005 | Escenario sin step `Then` |

En runtime: duración, fallos y flakiness **por step**, no solo por escenario.

### 20.3 Sugerencias opcionales (LLM)

Escenarios que podrían faltar ("contraseña inválida", "cuenta bloqueada"), marcados como sugerencia y nunca contados en el score.
