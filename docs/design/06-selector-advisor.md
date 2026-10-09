# Selector Advisor

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 14. Selector Advisor

Ayuda a elegir selectores robustos desde el inicio y sugiere reemplazos cuando uno falla. Reemplaza al self-healing de la versión 1.

### 14.1 Clasificación estática

El linter clasifica cada locator según su llamada en el AST:

| Nivel | Tipo | Ejemplos |
|---|---|---|
| 5 | Rol accesible + nombre | `getByRole("button", { name: "Pay" })` |
| 4 | Label / placeholder / texto | `getByLabel("Email")`, `getByText("Checkout")` |
| 3 | Test id | `getByTestId("checkout")`, `[data-testid=...]` |
| 2 | CSS por atributo estable | `button[name=submit]` |
| 1 | CSS estructural / XPath posicional | `div > div:nth-child(2) > button` |

Con `i18n: true`, el nivel 4 por texto visible baja por debajo del nivel 3, porque cambia con el idioma.

### 14.2 Datos en runtime

- **Fuente principal: traces de Playwright.** Contienen cada acción con su selector y snapshots del DOM antes y después. `atium selectors --collect` ejecuta la suite con `trace: "on"` para recolectarlos; en CI normal se usan los traces de `retain-on-failure`.
- **Fuente complementaria:** `ariaSnapshot` capturado por el fixture al fallar.

### 14.3 Generación y puntuación de candidatos

Para el elemento objetivo de cada acción se generan candidatos de todos los niveles y se puntúan:

$$
\text{score}(c) = 0.40\,U(c) + 0.25\,S(c) + 0.20\,H(c) + 0.15\,I(c)
$$

| Término | Significado | Valor |
|---|---|---|
| $U(c)$ | Unicidad | 1 si el candidato coincide con exactamente un elemento en el snapshot; 0 si no |
| $S(c)$ | Semántica | Nivel de 14.1 normalizado: 1.0, 0.8, 0.7, 0.4, 0.1 |
| $H(c)$ | Estabilidad histórica | $1 -$ tasa de fallos "no encontrado / no visible" de selectores del mismo tipo en ese archivo |
| $I(c)$ | Robustez ante idioma | 1, salvo selectores por texto con `i18n: true` (0.3) |

Los pesos son configurables. Un candidato con $U(c) = 0$ se descarta.

### 14.4 Salidas

```
login.spec.ts:18
  CURRENT:   page.locator("#app > div:nth-child(2) > button")     score 0.31
  SUGGESTED: page.getByRole("button", { name: "Sign in" })        score 0.95
  Evidence:  unique role + accessible name in 12 captured snapshots
```

- Ranking de selectores más inestables según el historial.
- Cuando un selector falla: candidatos para el elemento más parecido al objetivo anterior (mismo rol, texto o posición en el árbol accesible), entregados como diff o comentario en PR.
- **Nunca se aplica automáticamente**: un reemplazo incorrecto puede ocultar una regresión real.
