# Privacidad y seguridad

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 28. Privacidad y seguridad

| Tema | Medida |
|---|---|
| Telemetría | Ninguna. Ningún dato sale del entorno salvo al storage configurado |
| Red | Sin cuerpos ni headers por defecto; solo método, URL normalizada, status y timing |
| Mensajes, consola y snapshots | Redacción antes de guardar con patrones integrados que se activan por configuración (JWT, bearer, claves de nube; emails opcional, sin definir). Detalle en §28.1 |
| Secretos en tests | Regla E2E012 |
| LLM | Opt-in; solo recibe datos ya redactados; permite modelos locales |
| Chaos | Solo contra hosts permitidos; fuera de CI salvo `--allow-ci` |
| Plugins | Son código que corre con los permisos del usuario, igual que en ESLint. Solo se cargan desde la configuración, nunca desde el storage o desde datos analizados |
| Datos del storage | Se tratan como datos, nunca se ejecutan ni se interpretan como configuración |
| PRs desde forks | Patrón de dos workflows; sin `pull_request_target` |
| Credenciales | Solo por variables de entorno; nunca en el archivo de configuración |
| Retención | Configurable por nivel de datos |

### 28.1 Redacción

Se aplica con `createRedactor` de `@atium/core` (`packages/core/src/redact`) antes de persistir y antes de registrar en logs. Cada valor redactado se reemplaza por el marcador fijo `[REDACTED]`. La configuración es la sección `redact` ([18-cli-config.md](18-cli-config.md) §26.3). Cada lista que se omite toma su valor por defecto; una lista dada **reemplaza** al valor por defecto, no lo amplía.

`headers` y `bodyFields` contienen **fragmentos de nombre**. Un nombre es sensible si, normalizado (minúsculas y sin nada que no sea letra o dígito, en cualquier alfabeto), contiene algún fragmento normalizado de la lista: `token` cubre `accessToken`, `refresh_token` y `X-Auth-Token`; `apikey` cubre `x-api-key` y `API_KEY_ID`. Se eligió así, como el scrubbing por defecto de Sentry, porque un falso negativo filtra un secreto y un falso positivo solo oculta un dato de depuración (`tokenCount`, `passwordPolicy`). Un fragmento debe tener al menos una letra o un dígito: uno vacío tras normalizar coincidiría con todo. No se usa `auth` como fragmento por defecto porque cubriría `author`.

| Lista | Por defecto | Efecto |
|---|---|---|
| `headers` | `authorization`, `cookie`, `apikey`, `token`, `secret`, `session` | Se reemplaza el valor entero; un marcador por ocurrencia si el valor es un array. `headers: []` solo desactiva el reemplazo por nombre: los valores siguen pasando por los patrones |
| `bodyFields` | `password`, `passwd`, `secret`, `token`, `apikey`, `credential`, `privatekey`, `sessionid`, `cardnumber`, `cvv` | Se reemplaza el valor, sea cual sea su tipo, a cualquier profundidad. Las claves no se redactan |
| `patterns` | Los cinco de la tabla siguiente | Se aplican a todo texto, incluidos los valores de headers y los strings de cuerpo no sensibles, siempre en el orden de la tabla aunque la configuración los liste en otro |

| Patrón | Qué detecta | Qué se reemplaza |
|---|---|---|
| `jwt` | `eyJ<…>.eyJ<…>.<firma>`: header y payload base64url de un JSON; la firma puede estar vacía pero el segundo `.` es obligatorio | Todo el token |
| `bearer` | `bearer` (sin distinguir mayúsculas), espacios o tabs y un token | El token hasta el primer delimitador: `Bearer [REDACTED]` |
| `aws-key` | Access key id de AWS: `AKIA`, `ASIA`, `ABIA`, `ACCA` o `A3T` más una letra o dígito, seguido de exactamente 16 caracteres base32 | Todo |
| `gcp-key` | API key de Google Cloud: `AIza` y exactamente 35 caracteres base64url | Todo |
| `azure-key` | `AccountKey` o `SharedAccessKey` (sin distinguir mayúsculas, como los parsers de Azure), `=` con espacios opcionales y un valor | El valor hasta el primer delimitador |

- **Delimitadores** de `bearer` y `azure-key`: espacios en blanco, comillas, `<`, `>`, `,`, `;`, `[` y `]`. El valor se consume hasta ahí y no solo sobre el alfabeto del token, para que un token URL-encoded (`abc%2Fdef`) o con caracteres inesperados no quede redactado a medias.
- `jwt`, `aws-key` y `gcp-key` solo aceptan ASCII, como sus formatos. Un candidato pegado a más caracteres de su alfabeto (por ejemplo, 17 caracteres en `aws-key`) no se redacta.
- Las claves de nube incluyen GCP y Azure además de AWS para cubrir los tres proveedores principales. Las secret keys sin prefijo reconocible (como la secret access key de AWS) no se detectan sin contexto y quedan fuera; se cubren por nombre con `bodyFields` y `headers`.
- Ningún patrón usa cuantificadores anidados, y cada coincidencia solo puede empezar en una frontera de token (un lookbehind sobre el alfabeto del token), así que el tiempo es lineal en el tamaño de la entrada ([06-security.md](../engineering/06-security.md), "Entradas").
- Ningún patrón acepta `[` ni `]` dentro de un token, así que redactar dos veces da el mismo resultado que una.
- Se redacta antes de truncar: un secreto cortado por la mitad puede dejar de coincidir.
- `redactFields` solo recorre valores JSON (arrays y objetos planos). Un `Error`, un `Map` o una instancia de clase se devuelven tal cual, sin redactar, y un cuerpo que sigue en texto (JSON sin parsear, form-urlencoded) solo pasa por los patrones. Quien llama parsea el cuerpo antes.
- Falso positivo aceptado: en prosa, `bearer` seguido de una palabra la redacta ("the bearer [REDACTED] this").
- Fuera de alcance por ahora: emails (opcional en §28, sin definir), patrones definidos por el usuario y JWE (tokens cifrados de cinco partes).
