import { sql } from '../config/neon-config.js';
import { exigirRol, activarSalir, mostrarError, mensajeError, esc } from '../auth/auth.js';
import { formatearSoles } from '../registro/tarifario.js';

const usuario = exigirRol('cliente');
if (!usuario) throw new Error('Acceso denegado');
activarSalir();

export async function listarPropios() {
  return await sql`
    SELECT r.id, r.codigo_seguimiento, r.direccion, r.descripcion, r.estado, r.estado_pago, r.monto_calculado,
           r.fecha_registro, p.codigo_operacion
    FROM reportes_fuga r
    LEFT JOIN pagos p ON p.id_registro = r.id AND p.estado = 'aprobado'
    WHERE r.id_usuario = ${usuario.id} ORDER BY r.fecha_registro DESC;
  `;
}

function accion(r) {
  const enlaces = [];
  if (r.estado === 'registrado' && r.estado_pago !== 'pagado') enlaces.push(`<a href="actualizar.html?id=${Number(r.id)}">Editar</a>`);
  if (r.estado_pago === 'pendiente') enlaces.push(`<a href="pago.html?id=${Number(r.id)}">Pagar</a>`);
  if (r.estado_pago === 'pagado' && r.codigo_operacion) enlaces.push(`<a href="comprobante.html?op=${encodeURIComponent(r.codigo_operacion)}">Ver comprobante</a>`);
  return enlaces.join(' · ') || (r.estado_pago === 'exonerado' ? 'Exonerado' : '—');
}

try {
  const filas = await listarPropios();
  document.getElementById('vacio').hidden = filas.length > 0;
  document.getElementById('filas').innerHTML = filas.map((r) => `
    <tr>
      <td>${esc(r.codigo_seguimiento)}</td><td>${esc(r.direccion)}</td><td>${esc(r.descripcion)}</td>
      <td><span class="estado" data-estado="${esc(r.estado)}">${esc(r.estado)}</span></td>
      <td>${formatearSoles(Number(r.monto_calculado))}</td>
      <td><span class="estado" data-estado="${esc(r.estado_pago)}">${esc(r.estado_pago)}</span></td>
      <td>${new Date(r.fecha_registro).toLocaleDateString('es-PE')}</td>
      <td>${accion(r)}</td>
    </tr>`).join('');
} catch (err) { mostrarError(mensajeError(err, 'No se pudieron cargar tus reportes.')); }
