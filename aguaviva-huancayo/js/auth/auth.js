import { sql } from '../config/neon-config.js';

export async function registrarUsuario(nombre, correo, contrasena) {
  await sql`INSERT INTO usuarios (nombre, correo, contrasena) VALUES (${nombre}, ${correo}, ${contrasena})`;
}
export async function iniciarSesion(correo, contrasena) {
  const filas = await sql`
    SELECT id, nombre, rol, turno FROM usuarios
    WHERE correo = ${correo} AND contrasena = ${contrasena};
  `;
  if (filas.length === 0) return null;
  sessionStorage.setItem('usuario', JSON.stringify(filas[0]));
  return filas[0];
}
export function cerrarSesion() { sessionStorage.removeItem('usuario'); }
export function exigirSesion() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
  if (!usuario) {
    const pag = location.pathname.split('/').pop() + location.search;
    window.location.replace('login.html?siguiente=' + encodeURIComponent(pag));
    throw new Error('Sin sesión activa');
  }
  return usuario;
}
// Botón "Cerrar sesión" del menú
export function activarSalir() {
  document.getElementById('salir')?.addEventListener('click', (e) => {
    e.preventDefault(); cerrarSesion(); window.location.href = 'login.html';
  });
}
// Mensajes: el de éxito usa la animación de confirmación (Semana 5)
export function mostrarOk(texto) {
  document.getElementById('error').hidden = true;
  const el = document.getElementById('exito');
  el.hidden = true; el.textContent = texto; void el.offsetWidth; el.hidden = false;
}
export function mostrarError(texto) {
  document.getElementById('exito').hidden = true;
  const el = document.getElementById('error'); el.textContent = texto; el.hidden = false;
}
// Evita que el texto escrito por usuarios rompa el HTML de las tablas
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Validación común del formulario "Reporte de fuga"
export function validarReporte(d) {
  if (d.nombre_vecino.length < 3) return 'Escribe tu nombre (mínimo 3 letras).';
  if (d.direccion.length < 5) return 'Escribe la dirección de la fuga (mínimo 5 caracteres).';
  if (d.descripcion.length < 10) return 'Describe la fuga con al menos 10 caracteres.';
  if (d.imagen_url && !/^https?:\/\//i.test(d.imagen_url)) return 'El enlace de la foto debe empezar con http:// o https://';
  return null;
}
export function leerFormulario(f) {
  return {
    nombre_vecino: f.nombre_vecino.value.trim(), direccion: f.direccion.value.trim(),
    descripcion: f.descripcion.value.trim(), imagen_url: f.imagen_url.value.trim() || null,
    diametro_pulg: f.diametro_pulg ? f.diametro_pulg.value : undefined, zona: f.zona ? f.zona.value : undefined,
  };
}

// Mensaje claro cuando falla la conexión con Neon
export function mensajeError(err, porDefecto) {
  const m = err && err.message;
  if (m === 'NEON_SIN_CONFIGURAR') return 'Falta pegar tu cadena de conexión en js/config/neon-config.js.';
  if (m === 'NEON_NO_CARGA' || location.protocol === 'file:') return 'No se pudo cargar Neon. Abre el sitio con Live Server y revisa tu internet.';
  return porDefecto;
}

// Indicador de conexión con Neon (se muestra en login.html)
export async function probarConexion() { await sql`SELECT 1`; }

// exigirSesion() ya existe desde la Semana 6: devuelve el usuario o redirige a login.html

export function exigirRol(...rolesPermitidos) {
  const usuario = exigirSesion();
  if (!usuario) return null;
  if (!rolesPermitidos.includes(usuario.rol)) {
    alert('Tu perfil no tiene acceso a esta página.');
    window.location.href = 'index.html';
    return null;
  }
  return usuario;
}

export function rutaInicioSegunRol(rol) {
  const rutas = {
    cliente: 'registro.html',
    administrador: 'panel.html',
    empleado: 'panel.html',
    cajero: 'caja.html'
  };
  return rutas[rol] ?? 'index.html';
}

