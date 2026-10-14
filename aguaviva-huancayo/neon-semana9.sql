-- Semana 9 (AguaViva). Ejecutar DESPUÉS de neon.sql, en el SQL Editor de Neon. No forma parte del sitio.
ALTER TABLE reportes_fuga
  ADD COLUMN IF NOT EXISTS diametro_pulg NUMERIC(4,2) NOT NULL DEFAULT 0.5 CHECK (diametro_pulg > 0),
  ADD COLUMN IF NOT EXISTS zona VARCHAR(10) NOT NULL DEFAULT 'urbana' CHECK (zona IN ('urbana', 'rural'));


-- El CHECK creado en la semana del rol se llama usuarios_rol_check
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('cliente', 'administrador', 'empleado', 'cajero'));

-- El cajero busca al cliente por DNI
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni VARCHAR(8);

ALTER TABLE reportes_fuga
  ADD COLUMN IF NOT EXISTS monto_calculado NUMERIC(10,2) NOT NULL DEFAULT 0
      CHECK (monto_calculado >= 0),
  ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente'
      CHECK (estado_pago IN ('pendiente', 'pagado', 'exonerado')),
  ADD COLUMN IF NOT EXISTS canal_pago VARCHAR(10)
      CHECK (canal_pago IN ('pasarela', 'caja')),
  ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;

-- Lado del BANCO del cliente (simulado)
CREATE TABLE IF NOT EXISTS banco_cuentas (
  id               SERIAL PRIMARY KEY,
  numero_cuenta    VARCHAR(20) UNIQUE NOT NULL,
  titular          VARCHAR(100) NOT NULL,
  tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('ahorros', 'credito')),
  saldo_disponible NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo_disponible >= 0),
  moneda           CHAR(3) NOT NULL DEFAULT 'PEN'
);

CREATE TABLE IF NOT EXISTS banco_tarjetas (
  id        SERIAL PRIMARY KEY,
  numero    VARCHAR(19) UNIQUE NOT NULL,          -- solo dígitos, sin espacios
  id_cuenta INT NOT NULL REFERENCES banco_cuentas(id),
  titular   VARCHAR(100) NOT NULL,
  marca     VARCHAR(20) NOT NULL,
  tipo      VARCHAR(10) NOT NULL CHECK (tipo IN ('debito', 'credito')),
  mes_venc  SMALLINT NOT NULL CHECK (mes_venc BETWEEN 1 AND 12),
  anio_venc SMALLINT NOT NULL,
  cvv       VARCHAR(4) NOT NULL,                  -- solo existe del lado del emisor simulado
  estado    VARCHAR(10) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'bloqueada'))
);

-- Lado de la BILLETERA electrónica (simulada)
CREATE TABLE IF NOT EXISTS billeteras (
  id                SERIAL PRIMARY KEY,
  proveedor         VARCHAR(12) NOT NULL CHECK (proveedor IN ('andipay', 'pagomovil')),
  celular           VARCHAR(9) NOT NULL,
  titular           VARCHAR(100) NOT NULL,
  saldo_disponible  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo_disponible >= 0),
  codigo_aprobacion VARCHAR(6) NOT NULL,          -- simula el código que la app muestra al cliente
  UNIQUE (proveedor, celular)
);

CREATE TABLE IF NOT EXISTS pagos (
  id                  SERIAL PRIMARY KEY,
  codigo_operacion    VARCHAR(20) UNIQUE NOT NULL,
  id_registro         INT NOT NULL REFERENCES reportes_fuga(id),
  id_usuario          INT REFERENCES usuarios(id),          -- cliente que paga (puede ser NULL)
  canal               VARCHAR(10) NOT NULL CHECK (canal IN ('pasarela', 'caja')),
  metodo              VARCHAR(20) NOT NULL
                      CHECK (metodo IN ('tarjeta_debito', 'tarjeta_credito', 'billetera', 'efectivo', 'pos')),
  proveedor_billetera VARCHAR(12) CHECK (proveedor_billetera IN ('andipay', 'pagomovil')),
  marca_tarjeta       VARCHAR(20),
  referencia          VARCHAR(30),                          -- '**** 1111', '*** *** 321', 'Voucher 004512'
  monto               NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  monto_recibido      NUMERIC(10,2),                        -- solo efectivo
  vuelto              NUMERIC(10,2),                        -- solo efectivo
  estado              VARCHAR(10) NOT NULL CHECK (estado IN ('aprobado', 'rechazado')),
  motivo_rechazo      VARCHAR(120),
  id_cajero           INT REFERENCES usuarios(id),          -- quién cobró en ventanilla
  verificado          BOOLEAN NOT NULL DEFAULT false,       -- conciliación de pagos en línea
  verificado_por      INT REFERENCES usuarios(id),
  fecha_verificacion  TIMESTAMPTZ,
  fecha_pago          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Regla de oro: un registro no puede tener dos pagos APROBADOS (evita el doble cobro)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pagos_un_aprobado_por_registro
  ON pagos (id_registro) WHERE estado = 'aprobado';

INSERT INTO banco_cuentas (numero_cuenta, titular, tipo, saldo_disponible) VALUES
  ('0011-000001', 'ANA TORRES QUISPE',  'ahorros', 1500.00),
  ('0011-000002', 'LUIS PEREZ ROJAS',   'ahorros',   10.00),
  ('0022-000001', 'MARIA HUAMAN SOTO',  'credito', 3000.00),
  ('0022-000002', 'JORGE LIMA CRUZ',    'credito', 2000.00),
  ('0011-000003', 'ROSA CCENCHO VEGA',  'ahorros',  800.00)
ON CONFLICT (numero_cuenta) DO NOTHING;

INSERT INTO banco_tarjetas (numero, id_cuenta, titular, marca, tipo, mes_venc, anio_venc, cvv, estado)
SELECT t.numero, c.id, c.titular, t.marca, t.tipo, t.mes, t.anio, t.cvv, t.estado
FROM (VALUES
  ('4111111111111111', '0011-000001', 'Visa',             'debito',  12, 2029, '123',  'activa'),
  ('4000000000000002', '0011-000002', 'Visa',             'debito',   8, 2028, '456',  'activa'),
  ('5555555555554444', '0022-000001', 'Mastercard',       'credito',  5, 2030, '789',  'activa'),
  ('5105105105105100', '0022-000002', 'Mastercard',       'credito',  3, 2027, '321',  'bloqueada'),
  ('378282246310005',  '0022-000001', 'American Express', 'credito', 11, 2028, '1234', 'activa'),
  ('4242424242424242', '0011-000003', 'Visa',             'debito',   1, 2025, '111',  'activa')
) AS t(numero, cuenta, marca, tipo, mes, anio, cvv, estado)
JOIN banco_cuentas c ON c.numero_cuenta = t.cuenta
ON CONFLICT (numero) DO NOTHING;

INSERT INTO billeteras (proveedor, celular, titular, saldo_disponible, codigo_aprobacion) VALUES
  ('andipay',   '987654321', 'ANA TORRES QUISPE',  500.00, '123456'),
  ('pagomovil', '912345678', 'LUIS PEREZ ROJAS',    15.00, '654321'),
  ('andipay',   '999888777', 'MARIA HUAMAN SOTO', 1000.00, '111222')
ON CONFLICT (proveedor, celular) DO NOTHING;

INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES
  ('Cajera de Turno', 'caja@correo.com',  '1234', 'cajero'),
  ('Cajero Dos',      'caja2@correo.com', '1234', 'cajero')
ON CONFLICT (correo) DO NOTHING;

UPDATE usuarios
SET dni = (70000000 + id)::text
WHERE rol = 'cliente' AND dni IS NULL;

UPDATE reportes_fuga SET
  diametro_pulg = (ARRAY[0.5, 0.75, 1, 1.5, 2])[1 + id % 5],
  zona = CASE WHEN id % 3 = 0 THEN 'rural' ELSE 'urbana' END
WHERE monto_calculado = 0;
-- Regla de AguaViva: S/ 20 base + S/ 15 si diametro >= 1 + S/ 25 si zona rural
UPDATE reportes_fuga
SET monto_calculado = 20.00 + CASE WHEN diametro_pulg >= 1 THEN 15.00 ELSE 0 END
                           + CASE WHEN zona = 'rural' THEN 25.00 ELSE 0 END
WHERE monto_calculado = 0;

WITH elegidos AS (
  SELECT r.id, r.id_usuario, r.monto_calculado,
         ROW_NUMBER() OVER (ORDER BY r.id) AS n
  FROM reportes_fuga r
  WHERE r.estado_pago = 'pendiente' AND r.id_usuario IS NOT NULL
  ORDER BY r.id
  LIMIT 6
)
INSERT INTO pagos (codigo_operacion, id_registro, id_usuario, canal, metodo, proveedor_billetera,
                   marca_tarjeta, referencia, monto, monto_recibido, vuelto, estado, id_cajero)
SELECT
  'OP-SEED-' || LPAD(n::text, 3, '0'),
  id, id_usuario,
  CASE WHEN n <= 4 THEN 'pasarela' ELSE 'caja' END,
  (ARRAY['tarjeta_debito', 'tarjeta_credito', 'billetera', 'billetera', 'efectivo', 'pos'])[n],
  CASE n WHEN 3 THEN 'andipay' WHEN 4 THEN 'pagomovil' END,
  CASE n WHEN 1 THEN 'Visa' WHEN 2 THEN 'Mastercard' END,
  CASE n WHEN 1 THEN '**** 1111' WHEN 2 THEN '**** 4444' WHEN 3 THEN '*** *** 321'
         WHEN 4 THEN '*** *** 678' WHEN 5 THEN 'Efectivo' ELSE 'Voucher 004512' END,
  monto_calculado,
  CASE WHEN n = 5 THEN CEIL(monto_calculado / 10) * 10 END,
  CASE WHEN n = 5 THEN CEIL(monto_calculado / 10) * 10 - monto_calculado END,
  'aprobado',
  CASE WHEN n > 4 THEN (SELECT id FROM usuarios WHERE rol = 'cajero' ORDER BY id LIMIT 1) END
FROM elegidos;

-- Marcar como pagados los registros que ya tienen pago aprobado
UPDATE reportes_fuga r
SET estado_pago = 'pagado', canal_pago = p.canal, fecha_pago = p.fecha_pago
FROM pagos p
WHERE p.id_registro = r.id AND p.estado = 'aprobado';

-- Un intento rechazado por la pasarela
INSERT INTO pagos (codigo_operacion, id_registro, id_usuario, canal, metodo, marca_tarjeta,
                   referencia, monto, estado, motivo_rechazo)
SELECT 'RCH-SEED-001', r.id, r.id_usuario, 'pasarela', 'tarjeta_debito', 'Visa',
       '**** 0002', r.monto_calculado, 'rechazado', 'Saldo insuficiente en la cuenta de ahorros.'
FROM reportes_fuga r
WHERE r.estado_pago = 'pendiente' AND r.id_usuario IS NOT NULL
ORDER BY r.id DESC
LIMIT 1;

SELECT rol, COUNT(*) FROM usuarios GROUP BY rol ORDER BY rol;

SELECT estado_pago, canal_pago, COUNT(*) AS registros, SUM(monto_calculado) AS total
FROM reportes_fuga GROUP BY estado_pago, canal_pago ORDER BY estado_pago;

SELECT canal, metodo, estado, COUNT(*) AS operaciones, SUM(monto) AS total
FROM pagos GROUP BY canal, metodo, estado ORDER BY canal, metodo, estado;

