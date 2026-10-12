# Privacidad y seguridad

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 28. Privacidad y seguridad

| Tema | Medida |
|---|---|
| Telemetría | Ninguna. Ningún dato sale del entorno salvo al storage configurado |
| Red | Sin cuerpos ni headers por defecto; solo método, URL normalizada, status y timing |
| Mensajes, consola y snapshots | Redacción de patrones configurables (JWT, bearer, claves de nube, emails opcional) antes de guardar |
| Secretos en tests | Regla E2E012 |
| LLM | Opt-in; solo recibe datos ya redactados; permite modelos locales |
| Chaos | Solo contra hosts permitidos; fuera de CI salvo `--allow-ci` |
| Plugins | Son código que corre con los permisos del usuario, igual que en ESLint. Solo se cargan desde la configuración, nunca desde el storage o desde datos analizados |
| Datos del storage | Se tratan como datos, nunca se ejecutan ni se interpretan como configuración |
| PRs desde forks | Patrón de dos workflows; sin `pull_request_target` |
| Credenciales | Solo por variables de entorno; nunca en el archivo de configuración |
| Retención | Configurable por nivel de datos |

### 28.1 Redacción

La aplica `createRedactor` de `@atium/core` (`packages/core/src/redact`) antes de persistir y antes de registrar en logs. Cada valor redactado se reemplaza por el marcador fijo `[REDACTED]`. La configuración es la sección `redact` ([18-cli-config.md](18-cli-config.md)); cada lista que se omite toma su valor por defecto y una lista dada **reemplaza** al valor por defecto, no lo amplía (`headers: []` desactiva la redacción de headers).

| Lista | Por defecto | Comparación |
|---|---|---|
| `headers` | `authorization`, `cookie`, `set-cookie`, `x-api-key` | Nombre exacto, sin distinguir mayúsculas; se reemplaza el valor entero (un marcador por ocurrencia) |
| `bodyFields` | `password`, `token`, `cardNumber` | Clave exacta, sin distinguir mayúsculas, a cualquier profundidad; se reemplaza el valor sea cual sea su tipo |
| `patterns` | Los cinco de la tabla siguiente | Se aplican en este orden a todo texto, incluidos los headers y strings de cuerpo no sensibles |

| Patrón | Qué detecta | Qué se reemplaza |
|---|---|---|
| `jwt` | `eyJ<…>.eyJ<…>.<firma>` (header y payload base64url de un JSON; firma opcional) | Todo el token |
| `bearer` | `bearer` (sin distinguir mayúsculas), espacios o tabs y un b64token de RFC 6750 | Solo el token: `Bearer [REDACTED]` |
| `aws-key` | Access key id de AWS: `AKIA`, `ASIA`, `ABIA`, `ACCA` o `A3T` más un carácter, seguido de 16 caracteres base32 | Todo |
| `gcp-key` | API key de Google Cloud: `AIza` y 35 caracteres base64url | Todo |
| `azure-key` | `AccountKey=` o `SharedAccessKey=` de un connection string de Azure | Solo el valor |

- Las claves de nube incluyen GCP y Azure además de AWS para cubrir los tres proveedores principales; las secret keys sin prefijo reconocible (como la secret access key de AWS) no se detectan sin contexto y quedan fuera.
- Ningún patrón usa cuantificadores anidados y cada coincidencia solo puede empezar al inicio de un token, así que el tiempo es lineal en el tamaño de la entrada (06-security.md, "Entradas").
- Ningún patrón acepta `[` ni `]` dentro de un token, así que redactar dos veces da el mismo resultado que una.
- Se redacta antes de truncar: un secreto cortado por la mitad puede dejar de coincidir.
- Falso positivo aceptado: en prosa, `bearer` seguido de una palabra la redacta ("the bearer [REDACTED] this").
- Fuera de alcance por ahora: emails (opcional en esta sección, sin definir) y patrones definidos por el usuario.
