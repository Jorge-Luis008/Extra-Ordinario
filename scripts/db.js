// Data base 
// db.js — Inicialización de SQLite con SQL.js
let db;

async function initDB() {
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  const saved = localStorage.getItem('appdb');
  if (saved) {
    const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
    createTables();
    seedData();
  }
}

function saveDB() {
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem('appdb', base64);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL CHECK(precio >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      categoria TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo','inactivo')),
      fecha_creacion TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      rol TEXT NOT NULL DEFAULT 'cliente' CHECK(rol IN ('admin','cliente','editor')),
      estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo','inactivo')),
      fecha_registro TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','en_progreso','completada','cancelada')),
      prioridad TEXT NOT NULL DEFAULT 'media' CHECK(prioridad IN ('baja','media','alta')),
      usuario_id INTEGER,
      fecha_limite TEXT,
      fecha_creacion TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL CHECK(cantidad > 0),
      estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','confirmada','cancelada','completada')),
      fecha_reserva TEXT NOT NULL,
      notas TEXT,
      fecha_creacion TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );

    CREATE TABLE IF NOT EXISTS catalogo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('libro','video','curso','articulo','podcast')),
      autor TEXT NOT NULL,
      descripcion TEXT,
      url TEXT,
      estado TEXT NOT NULL DEFAULT 'publicado' CHECK(estado IN ('borrador','publicado','archivado')),
      fecha_publicacion TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedData() {
  // Usuarios de ejemplo
  db.run(`INSERT INTO usuarios (nombre, email, rol) VALUES
    ('Admin Sistema', 'admin@sistema.com', 'admin'),
    ('María García', 'maria@email.com', 'cliente'),
    ('Carlos López', 'carlos@email.com', 'editor')`);

  // Productos de ejemplo
  db.run(`INSERT INTO productos (nombre, descripcion, precio, stock, categoria) VALUES
    ('Laptop Pro X', 'Laptop de alto rendimiento 16GB RAM', 1299.99, 15, 'Electrónica'),
    ('Mouse Inalámbrico', 'Mouse ergonómico 2.4GHz', 29.99, 50, 'Periféricos'),
    ('Monitor 4K', 'Monitor 27 pulgadas UHD', 399.99, 8, 'Electrónica'),
    ('Teclado Mecánico', 'Teclado RGB switches azules', 89.99, 30, 'Periféricos')`);

  // Tareas de ejemplo
  db.run(`INSERT INTO tareas (titulo, descripcion, estado, prioridad, usuario_id) VALUES
    ('Revisar inventario', 'Actualizar stock de productos', 'pendiente', 'alta', 1),
    ('Llamar proveedor', 'Negociar precios Q3', 'en_progreso', 'media', 2),
    ('Actualizar catálogo', 'Agregar nuevos artículos', 'pendiente', 'baja', 3)`);

  // Catálogo de ejemplo
  db.run(`INSERT INTO catalogo (titulo, tipo, autor, descripcion) VALUES
    ('JavaScript: The Good Parts', 'libro', 'Douglas Crockford', 'Fundamentos esenciales de JS'),
    ('Introducción a SQL', 'video', 'Tech Academy', 'Curso básico de bases de datos'),
    ('Clean Code', 'libro', 'Robert C. Martin', 'Principios de código limpio')`);

  saveDB();
}

// ─── REGLAS DE NEGOCIO ──────────────────────────────────────────────────────

// REGLA 1: Validación de duplicidad de email en usuarios
function emailExiste(email, excludeId = null) {
  let query = `SELECT COUNT(*) as total FROM usuarios WHERE email = ?`;
  const params = [email.toLowerCase().trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const result = db.exec(query, params);
  return result[0].values[0][0] > 0;
}

// REGLA 2: Control de estados de tareas (solo avance hacia adelante)
const FLUJO_ESTADOS_TAREA = {
  'pendiente':   ['en_progreso', 'cancelada'],
  'en_progreso': ['completada', 'cancelada'],
  'completada':  [],
  'cancelada':   []
};

function cambioEstadoValido(estadoActual, nuevoEstado) {
  const permitidos = FLUJO_ESTADOS_TAREA[estadoActual] || [];
  return permitidos.includes(nuevoEstado);
}

// REGLA 3: No eliminar reservas activas/confirmadas
function reservaEliminable(id) {
  const result = db.exec(`SELECT estado FROM reservas WHERE id = ?`, [id]);
  if (!result.length) return false;
  const estado = result[0].values[0][0];
  return estado === 'cancelada' || estado === 'completada';
}

// REGLA 4: Stock suficiente para reservas
function stockSuficiente(productoId, cantidad, reservaId = null) {
  const prod = db.exec(`SELECT stock FROM productos WHERE id = ?`, [productoId]);
  if (!prod.length) return false;
  const stock = prod[0].values[0][0];

  // Stock ya reservado (excluyendo la reserva actual si se edita)
  let queryReservado = `SELECT COALESCE(SUM(cantidad), 0) as total 
    FROM reservas WHERE producto_id = ? AND estado IN ('pendiente','confirmada')`;
  const params = [productoId];
  if (reservaId) {
    queryReservado += ` AND id != ?`;
    params.push(reservaId);
  }
  const reservado = db.exec(queryReservado, params);
  const totalReservado = reservado[0].values[0][0];
  return (stock - totalReservado) >= cantidad;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function queryAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}