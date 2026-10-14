import { sql } from '../config/neon-config.js';
import { exigirRol, activarSalir, mostrarOk, mostrarError, mensajeError, validarReporte, leerFormulario, esc } from '../auth/auth.js';

const usuario = exigirRol('administrador', 'empleado');
if (!usuario) throw new Error('Acceso denegado');
activarSalir();
// Un cliente no puede entrar al panel: solo administrador o empleado
if (usuario.rol === 'cliente') { window.location.href = 'registro.html'; throw new Error('Solo personal'); }
// Turnos (hora de Lima): mañana 06-14, tarde 14-22, noche-madrugada 22-06
const TURNOS = { manana: 'mañana 06:00-14:00', tarde: 'tarde 14:00-22:00', noche: 'noche-madrugada 22:00-06:00' };
const hora = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'America/Lima' }).format(new Date()));
const turnoAhora = hora >= 6 && hora < 14 ? 'manana' : hora >= 14 && hora < 22 ? 'tarde' : 'noche';
// El administrador siempre puede; el empleado solo dentro de su turno
const puedeEditar = usuario.rol === 'administrador' || usuario.turno === turnoAhora;
document.getElementById('rol').textContent = 'Sesión: ' + usuario.nombre + ' (' + usuario.rol +
  (usuario.turno ? ', turno ' + TURNOS[usuario.turno] : '') + ')' +
  (puedeEditar ? '' : ' · Fuera de tu turno: solo lectura. Ahora es el turno ' + TURNOS[turnoAhora] + '.');
// La base de datos vuelve a comprobar el rol y el turno (no depende solo de la pantalla)


// Consultar: todos los registros, no solo los propios
export async function listarTodos() { return await sql`SELECT * FROM reportes_fuga ORDER BY fecha_registro DESC;`; }
// Crear: sin cliente en sesión, id_usuario queda NULL (atención presencial o telefónica)
export async function crearRegistro(d) {
  const codigo = 'COD-' + Date.now().toString().slice(-8);
  const r = await sql`
    INSERT INTO reportes_fuga (codigo_seguimiento, nombre_vecino, direccion, descripcion, imagen_url, estado, monto_calculado)
    SELECT ${codigo}::text, ${d.nombre_vecino}::text, ${d.direccion}::text, ${d.descripcion}::text, ${d.imagen_url}::text, 'registrado', 20.00
    WHERE EXISTS (SELECT 1 FROM usuarios u WHERE u.id = ${usuario.id} AND (u.rol = 'administrador' OR (u.rol = 'empleado' AND u.turno =
    CASE WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Lima') BETWEEN 6 AND 13 THEN 'manana'
         WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Lima') BETWEEN 14 AND 21 THEN 'tarde' ELSE 'noche' END)))
    RETURNING id;
  `;
  if (r.length === 0) throw new Error('FUERA_DE_TURNO');
  return codigo;
}
// Actualizar: cualquier registro, incluido el estado
export async function actualizarComoPanel(id, d) {
  const r = await sql`
    UPDATE reportes_fuga
    SET nombre_vecino = ${d.nombre_vecino}, direccion = ${d.direccion}, descripcion = ${d.descripcion},
        imagen_url = ${d.imagen_url}, estado = ${d.estado}
    WHERE id = ${id} AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = ${usuario.id} AND (u.rol = 'administrador' OR (u.rol = 'empleado' AND u.turno =
    CASE WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Lima') BETWEEN 6 AND 13 THEN 'manana'
         WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Lima') BETWEEN 14 AND 21 THEN 'tarde' ELSE 'noche' END)))
    RETURNING id;
  `;
  if (r.length === 0) throw new Error('FUERA_DE_TURNO');
}
// Eliminar: la interfaz pide confirmación antes de llamar esta función
export async function eliminarRegistro(id) {
  const r = await sql`DELETE FROM reportes_fuga WHERE id = ${id} AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = ${usuario.id} AND (u.rol = 'administrador' OR (u.rol = 'empleado' AND u.turno =
    CASE WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Lima') BETWEEN 6 AND 13 THEN 'manana'
         WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Lima') BETWEEN 14 AND 21 THEN 'tarde' ELSE 'noche' END))) RETURNING id;`;
  if (r.length === 0) throw new Error('FUERA_DE_TURNO');
}

const form = document.getElementById('form-panel');
const tbody = document.getElementById('filas');
let filas = [];

async function cargar() {
  try {
    filas = await listarTodos();
    tbody.innerHTML = filas.map((r) => `
      <tr><td>${esc(r.codigo_seguimiento)}</td><td>${esc(r.nombre_vecino)}</td><td>${esc(r.direccion)}</td>
      <td>${esc(r.descripcion)}</td><td><span class="estado" data-estado="${esc(r.estado)}">${esc(r.estado)}</span></td>
      <td><span class="estado" data-estado="${esc(r.estado_pago)}">${esc(r.estado_pago)}</span>${r.canal_pago ? ' · ' + esc(r.canal_pago) : ''}</td>
      <td><button type="button" data-editar="${Number(r.id)}" ${puedeEditar ? '' : 'disabled'}>Editar</button>
      <button type="button" class="borrar" data-borrar="${Number(r.id)}" ${puedeEditar ? '' : 'disabled'}>Eliminar</button></td></tr>`).join('');
  } catch (err) { mostrarError(mensajeError(err, 'No se pudieron cargar los reportes.')); }
}

function modoCrear() {
  form.reset(); document.getElementById('id').value = '';
  document.getElementById('titulo-form').textContent = 'Nuevo reporte';
  document.getElementById('guardar').textContent = 'Crear reporte';
  document.getElementById('cancelar').hidden = true;
  form.estado.value = 'registrado'; form.estado.disabled = true; // un reporte nuevo siempre nace "registrado"
}
modoCrear();
if (!puedeEditar) { for (const el of form.elements) el.disabled = true; }
document.getElementById('cancelar').addEventListener('click', modoCrear);

tbody.addEventListener('click', async (e) => {
  const idEditar = e.target.dataset.editar, idBorrar = e.target.dataset.borrar;
  if (idEditar) {
    const r = filas.find((x) => x.id == idEditar);
    document.getElementById('id').value = r.id; form.nombre_vecino.value = r.nombre_vecino ?? ''; form.direccion.value = r.direccion ?? '';
    form.descripcion.value = r.descripcion ?? ''; form.imagen_url.value = r.imagen_url ?? '';
    form.estado.disabled = false; form.estado.value = r.estado;
    document.getElementById('titulo-form').textContent = 'Editar reporte ' + r.codigo_seguimiento;
    document.getElementById('guardar').textContent = 'Guardar cambios';
    document.getElementById('cancelar').hidden = false;
    form.scrollIntoView({ behavior: 'smooth' });
  }
  if (idBorrar && confirm('¿Seguro que quieres eliminar este reporte? No se puede deshacer.')) {
    try { await eliminarRegistro(idBorrar); mostrarOk('Reporte eliminado.'); await cargar(); }
    catch (err) { mostrarError(err.code === '23503' ? 'No se puede eliminar: tiene historial de pagos. Cambia su estado a rechazado.' : err.message === 'FUERA_DE_TURNO' ? 'No puedes eliminar reportes fuera de tu turno.' : mensajeError(err, 'No se pudo eliminar.')); }
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = leerFormulario(form);
  const problema = validarReporte(datos);
  if (problema) return mostrarError(problema);
  try {
    if (document.getElementById('id').value) { await actualizarComoPanel(document.getElementById('id').value, { ...datos, estado: form.estado.value }); mostrarOk('Reporte actualizado.'); }
    else { const c = await crearRegistro(datos); mostrarOk('Reporte creado con código ' + c); }
    modoCrear(); await cargar();
  } catch (err) { mostrarError(err.message === 'FUERA_DE_TURNO' ? 'No puedes modificar reportes fuera de tu turno.' : mensajeError(err, 'No se pudo guardar.')); }
});
cargar();
