# Credenciales de prueba (contraseña de todas: `1234`)

| Rol | Correos |
|---|---|
| Clientes (10, con 3 reportes cada uno = 30) | cliente1@correo.com … cliente10@correo.com |
| Administrador (1) | admin@correo.com |
| Empleado turno mañana (06:00-14:00) | empleado1@correo.com |
| Empleado turno tarde (14:00-22:00) | empleado2@correo.com |
| Empleado turno noche-madrugada (22:00-06:00) | empleado3@correo.com |

Horario de Lima. El empleado solo puede crear, editar y eliminar dentro de su turno; fuera de él ve el panel en solo lectura. El administrador siempre puede.

## Semana 9 (pagos)
Ejecutar en Neon, en este orden: `neon.sql` y luego `neon-semana9.sql`.

| Rol | Correo (contraseña `1234`) |
|---|---|
| Cajeros (2) | caja@correo.com, caja2@correo.com |

DNI de los clientes de prueba: `70000001` … `70000010` (cliente1 … cliente10).

Medios de prueba (ficticios): Visa 4111 1111 1111 1111, 12/29, CVV 123 (aprueba) · Visa 4000 0000 0000 0002, 08/28, CVV 456 (saldo insuficiente) · Mastercard 5555 5555 5555 4444, 05/30, CVV 789 (crédito, aprueba) · Mastercard 5105 1051 0510 5100, 03/27, CVV 321 (tarjeta bloqueada) · Visa 4242 4242 4242 4242, 01/25 (vencida) · AndiPay 987654321, código 123456 · PagoMóvil 912345678, código 654321 (saldo bajo).
