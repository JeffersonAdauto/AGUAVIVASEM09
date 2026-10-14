import { registrarUsuario, iniciarSesion, mostrarOk, mostrarError, mensajeError, probarConexion, rutaInicioSegunRol } from './auth.js';

const formLogin = document.getElementById('form-login');
const formCrear = document.getElementById('form-crear');
const tabLogin = document.getElementById('tab-login');
const tabCrear = document.getElementById('tab-crear');

function mostrarPestana(crear) {
  formLogin.hidden = crear; formCrear.hidden = !crear;
  tabLogin.classList.toggle('activa', !crear); tabCrear.classList.toggle('activa', crear);
}
tabLogin.addEventListener('click', () => mostrarPestana(false));
tabCrear.addEventListener('click', () => mostrarPestana(true));

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const usuario = await iniciarSesion(formLogin['l-correo'].value.trim(), formLogin['l-clave'].value);
    if (!usuario) return mostrarError('Correo o contraseña incorrectos.');
    const sig = new URLSearchParams(location.search).get('siguiente') || '';
    const valida = /^(registro|consulta|panel|actualizar|pago|comprobante|caja)\.html(\?(id|op)=[\w-]+)?$/.test(sig);
    window.location.href = valida ? sig : rutaInicioSegunRol(usuario.rol);
  } catch (err) { mostrarError(mensajeError(err, 'No se pudo conectar con la base de datos.')); }
});

formCrear.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = formCrear['c-nombre'].value.trim();
  if (nombre.length < 3) return mostrarError('Escribe tu nombre completo.');
  try {
    await registrarUsuario(nombre, formCrear['c-correo'].value.trim(), formCrear['c-clave'].value);
    formCrear.reset(); mostrarPestana(false);
    mostrarOk('Cuenta creada. Ahora inicia sesión.');
  } catch (err) {
    mostrarError(/duplicate|unique/i.test(err.message) ? 'Ese correo ya está registrado.' : mensajeError(err, 'No se pudo crear la cuenta.'));
  }
});

if (new URLSearchParams(location.search).get('siguiente')) mostrarError('Inicia sesión para entrar a esa página.');

const bd = document.getElementById('estado-bd');
probarConexion().then(() => { bd.textContent = 'Base de datos Neon: conectada'; bd.dataset.ok = 'si'; })
  .catch((err) => { bd.textContent = 'Base de datos Neon: sin conexión. ' + mensajeError(err, 'Revisa la cadena de conexión.'); bd.dataset.ok = 'no'; });
