import { sql } from '../config/neon-config.js';
import { exigirRol, activarSalir, mostrarError, mensajeError, validarReporte, leerFormulario } from '../auth/auth.js';
import { calcularMontoServicio, formatearSoles } from './tarifario.js';

const usuario = exigirRol('cliente');
if (!usuario) throw new Error('Acceso denegado');
activarSalir();
const form = document.getElementById('form-reporte');
const salidaMonto = document.getElementById('monto-estimado');
form.nombre_vecino.value = usuario.nombre;

// Cotizador en vivo: se recalcula en cada tecla (input) y en cada cambio (radio/número)
const cotizar = () => { salidaMonto.textContent = formatearSoles(calcularMontoServicio(leerFormulario(form))); };
form.addEventListener('input', cotizar);
form.addEventListener('change', cotizar);
cotizar();

export async function guardarRegistro(d, monto) {
  const codigo = 'COD-' + Date.now().toString().slice(-8); // 12 caracteres
  const filas = await sql`
    INSERT INTO reportes_fuga (codigo_seguimiento, nombre_vecino, direccion, descripcion, imagen_url, id_usuario,
                               diametro_pulg, zona, monto_calculado, estado_pago)
    VALUES (${codigo}, ${d.nombre_vecino}, ${d.direccion}, ${d.descripcion}, ${d.imagen_url}, ${usuario.id},
            ${d.diametro_pulg}, ${d.zona}, ${monto}, 'pendiente')
    RETURNING id;
  `;
  return filas[0].id;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = leerFormulario(form);
  const problema = validarReporte(datos) || (Number(datos.diametro_pulg) > 0 ? null : 'Indica un diámetro mayor que 0.');
  if (problema) return mostrarError(problema);
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    const id = await guardarRegistro(datos, calcularMontoServicio(datos));
    window.location.href = 'pago.html?id=' + id;
  } catch (err) { mostrarError(mensajeError(err, 'No se pudo guardar. Intenta de nuevo.')); boton.disabled = false; }
});
