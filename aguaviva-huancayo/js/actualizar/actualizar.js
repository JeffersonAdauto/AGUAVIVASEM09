import { sql } from '../config/neon-config.js';
import { exigirRol, activarSalir, mostrarOk, mostrarError, mensajeError, validarReporte, leerFormulario } from '../auth/auth.js';

import { calcularMontoServicio } from '../registro/tarifario.js';

const usuario = exigirRol('cliente');
if (!usuario) throw new Error('Acceso denegado');
activarSalir();
const form = document.getElementById('form-reporte');
const id = Number(new URLSearchParams(location.search).get('id'));

export async function actualizarRegistro(id, d) {
  const monto = calcularMontoServicio(d);
  // Solo el dueño, solo si sigue registrado y NO está pagado; el monto se recalcula
  const filas = await sql`
    UPDATE reportes_fuga
    SET nombre_vecino = ${d.nombre_vecino}, direccion = ${d.direccion}, descripcion = ${d.descripcion},
        imagen_url = ${d.imagen_url}, diametro_pulg = ${d.diametro_pulg}, zona = ${d.zona}, monto_calculado = ${monto}
    WHERE id = ${id} AND id_usuario = ${usuario.id} AND estado = 'registrado' AND estado_pago <> 'pagado'
    RETURNING id;
  `;
  return filas.length === 1;
}

try {
  const filas = await sql`SELECT * FROM reportes_fuga WHERE id = ${id} AND id_usuario = ${usuario.id};`;
  if (filas.length === 0) throw new Error('no encontrado');
  const r = filas[0];
  form.nombre_vecino.value = r.nombre_vecino ?? ''; form.direccion.value = r.direccion ?? '';
  form.descripcion.value = r.descripcion ?? ''; form.imagen_url.value = r.imagen_url ?? '';
  form.diametro_pulg.value = r.diametro_pulg; form.zona.value = r.zona;
  document.getElementById('codigo').textContent = 'Código de seguimiento: ' + r.codigo_seguimiento;
  if (r.estado !== 'registrado' || r.estado_pago === 'pagado') { // ya atendido: solo lectura
    document.getElementById('campos').disabled = true;
    document.getElementById('guardar').hidden = true;
    document.getElementById('aviso').hidden = false;
  }
} catch (err) { mostrarError(mensajeError(err, 'No se encontró ese reporte.')); document.getElementById('guardar').hidden = true; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = leerFormulario(form);
  const problema = validarReporte(datos);
  if (problema) return mostrarError(problema);
  try {
    if (await actualizarRegistro(id, datos)) mostrarOk('Reporte actualizado. El monto se recalculó.');
    else mostrarError('Este reporte ya fue pagado o atendido y no se puede editar.');
  }
  catch (err) { mostrarError(mensajeError(err, 'No se pudo actualizar.')); }
});
