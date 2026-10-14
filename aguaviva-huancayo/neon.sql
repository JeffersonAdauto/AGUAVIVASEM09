-- Pegar en Neon > SQL Editor. REINICIA las tablas (borra lo anterior). No forma parte del sitio.
DROP TABLE IF EXISTS pagos, banco_tarjetas, banco_cuentas, billeteras, reportes_fuga CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(120) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT NOW()
);
ALTER TABLE usuarios
  ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'cliente'
  CHECK (rol IN ('cliente', 'administrador', 'empleado'));
-- Turno del empleado (hora de Lima): manana 06-14, tarde 14-22, noche = noche-madrugada 22-06
ALTER TABLE usuarios ADD COLUMN turno VARCHAR(10) CHECK (turno IN ('manana', 'tarde', 'noche'));

CREATE TABLE reportes_fuga (
  id SERIAL PRIMARY KEY,
  codigo_seguimiento VARCHAR(12) UNIQUE NOT NULL,
  nombre_vecino VARCHAR(120),
  direccion VARCHAR(200),
  descripcion TEXT,
  imagen_url VARCHAR(255),
  estado VARCHAR(30) DEFAULT 'registrado',
  fecha_registro TIMESTAMP DEFAULT NOW()
);
ALTER TABLE reportes_fuga ADD COLUMN id_usuario INT REFERENCES usuarios(id);

-- 10 clientes + 1 administrador + 3 empleados (uno por turno). Contrasena de todos: 1234
INSERT INTO usuarios (nombre, correo, contrasena, rol, turno)
SELECT 'Cliente ' || n, 'cliente' || n || '@correo.com', '1234', 'cliente', NULL
FROM generate_series(1, 10) AS n
UNION ALL
VALUES
  ('Admin de prueba', 'admin@correo.com', '1234', 'administrador', NULL),
  ('Empleado Mañana', 'empleado1@correo.com', '1234', 'empleado', 'manana'),
  ('Empleado Tarde', 'empleado2@correo.com', '1234', 'empleado', 'tarde'),
  ('Empleado Noche', 'empleado3@correo.com', '1234', 'empleado', 'noche');

-- 30 reportes distintos (10 calles de Huancayo x 3 problemas), 3 por cada cliente
INSERT INTO reportes_fuga (id_usuario, codigo_seguimiento, nombre_vecino, direccion, descripcion, estado, fecha_registro)
SELECT u.id, 'COD-' || lpad(((c.n - 1) * 3 + s)::text, 8, '0'), u.nombre,
  (ARRAY['Jr. Real 215','Av. Giráldez 480','Calle Ancash 132','Jr. Puno 76','Av. Ferrocarril 910',
         'Jr. Cajamarca 254','Av. Mariscal Castilla 1020','Calle Real 640','Jr. Arequipa 318','Av. Huancavelica 505'])[c.n] || ', Huancayo',
  (ARRAY['Fuga de agua en la vereda frente a mi casa','Tubería rota que inunda la calzada','Buzón de desagüe desbordado en la esquina'])[s],
  CASE WHEN s = 1 THEN 'registrado' WHEN s = 2 THEN 'atendido' ELSE (ARRAY['atendido','rechazado'])[1 + (c.n % 2)] END,
  NOW() - ((c.n * 3 + s) || ' days')::interval
FROM (SELECT id, row_number() OVER (ORDER BY id) AS n FROM usuarios WHERE rol = 'cliente') c
JOIN usuarios u ON u.id = c.id
CROSS JOIN generate_series(1, 3) AS s;
