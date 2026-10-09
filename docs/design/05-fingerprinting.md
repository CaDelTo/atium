# Fingerprinting de errores

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 13. Fingerprinting de errores

Base del triage, del análisis de flaky y del agrupamiento en reportes.

### 13.1 Algoritmo

1. Quitar códigos ANSI.
2. Para errores de `expect`: usar nombre del matcher + tipo de valor esperado, no los valores concretos.
3. Para el resto: primera línea del mensaje.
4. Reemplazar en el mensaje:

| Patrón | Reemplazo |
|---|---|
| UUID | `<uuid>` |
| Hex ≥ 8 caracteres | `<hex>` |
| Números (incluye duraciones como `5000ms`) | `<n>` |
| URLs | host + `urlTemplate` |
| Rutas absolutas | Ruta relativa a la raíz del repo |
| Strings entre comillas de más de 40 caracteres | `<str>` |
| Timestamps ISO | `<ts>` |

5. Tomar los 3 primeros frames del stack que pertenezcan al código del usuario (excluye `node_modules` e internos del framework), como `archivo:función` **sin número de línea**.
6. `fingerprint = sha1(tipo | mensaje normalizado | frames).slice(0, 16)`.

### 13.2 Familias

`family = sha1(tipo | archivo y función del primer frame del usuario)`. Agrupa errores parecidos con mensajes distintos (por ejemplo, el mismo locator que falla con textos diferentes).
