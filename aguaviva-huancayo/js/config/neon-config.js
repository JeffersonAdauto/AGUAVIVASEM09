// Conexión a Neon (se crea una sola vez y la usan todos los demás scripts).
// Pega aquí tu cadena: Neon > tu proyecto > Connect > Connection string
// (si trae "&channel_binding=require", quítalo).
const CADENA = "postgresql://neondb_owner:npg_1T5JfLvnldXe@ep-raspy-mouse-b5myi3zw-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";

let conexion = null;
if (!CADENA.startsWith("TU_")) {
  try {
    const { neon } = await import("https://esm.sh/@neondatabase/serverless");
    conexion = neon(CADENA, { disableWarningInBrowsers: true });
  } catch (e) { /* si el CDN falla, las páginas siguen cargando y avisan */ }
}
function listo() {
  if (CADENA.startsWith("TU_")) throw new Error("NEON_SIN_CONFIGURAR");
  if (!conexion) throw new Error("NEON_NO_CARGA");
  return conexion;
}
export const sql = (...args) => listo()(...args);
// Las transacciones (cobro todo-o-nada) usan sql.transaction y sql.query de Neon
sql.transaction = (...args) => listo().transaction(...args);
sql.query = (...args) => listo().query(...args);
