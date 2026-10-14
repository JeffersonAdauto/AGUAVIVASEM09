// js/registro/tarifario.js
// Función PURA: recibe datos y devuelve un número. No toca el DOM ni la base de datos,
// por eso se puede probar en la consola: calcularMontoServicio({ diametro_pulg: '1', zona: 'rural' })

export function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

export function formatearSoles(monto) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto);
}

// Utilidad: un checkbox marcado llega en FormData como 'on'; si no está marcado, NO llega
export const marcado = (valor) => valor === 'on';

// Caso 1, AguaViva: S/ 20.00 base + S/ 15.00 si diámetro >= 1" + S/ 25.00 si zona rural
export function calcularMontoServicio(datos) {
  let total = 20.00;
  if (Number(datos.diametro_pulg) >= 1) total += 15.00;
  if (datos.zona === 'rural') total += 25.00;
  return redondear(total);
}

