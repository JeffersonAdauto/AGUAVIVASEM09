# AguaViva Huancayo — Diseño Web (NRC 30239), Semanas 5 a 7

1. En Neon crea un proyecto y copia la cadena de conexión.
2. Abre `neon.sql`, pégalo en el SQL Editor de Neon y ejecútalo (crea las tablas y los datos de prueba).
3. En `js/config/neon-config.js` reemplaza `TU_CADENA_DE_CONEXION_DE_NEON` por tu cadena (si trae `&channel_binding=require`, quítalo).
4. Abre la carpeta en VS Code y ejecuta `index.html` con Live Server (los módulos JS no funcionan abriendo el archivo con doble clic).

Si una página te manda a login.html, es porque solo el inicio es público.

Cuentas de prueba (contraseña `1234`): `cliente1@correo.com`, `admin@correo.com`, `empleado1@correo.com`.

## Entrega
- GitHub: crea un repositorio y sube el contenido de esta carpeta (que `index.html` quede en la raíz).
- Vercel: Add New > Project > importa el repositorio. Framework: Other, sin comando de build. Cada vez que subas cambios a GitHub se vuelve a publicar.
- Antes de subir, pega tu cadena de Neon en `js/config/neon-config.js`. Ejecuta `neon.sql` completo (reinicia las tablas).
- Credenciales para el docente: `CREDENCIALES.md`.
