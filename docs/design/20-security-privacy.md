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
