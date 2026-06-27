// productos.js - CRUD completo (entidad principal)

const Productos = {

  // --- CREAR ---
  crear(datos) {
    const { nombre, descripcion, precio, stock, categoria } = datos;

    // Validaciones
    if (!nombre || nombre.trim() === '') throw new Error('El nombre del producto es obligatorio.');
    if (precio < 0) throw new Error('El precio no puede ser negativo.');
    if (stock < 0) throw new Error('El stock no puede ser negativo.');
    if (!categoria) throw new Error('La categoría es obligatoria.');

    // REGLA DE NEGOCIO: No duplicar nombre en la misma categoría
    const existe = queryOne(
      `SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?) AND categoria = ?`,
      [nombre.trim(), categoria]
    );
    if (existe) throw new Error(`Ya existe un producto con ese nombre en la categoría "${categoria}".`);

    db.run(
      `INSERT INTO productos (nombre, descripcion, precio, stock, categoria, estado)
       VALUES (?, ?, ?, ?, ?, 'activo')`,
      [nombre.trim(), descripcion || '', parseFloat(precio), parseInt(stock), categoria]
    );
    saveDB();
    return { ok: true, mensaje: 'Producto creado correctamente.' };
  },

  // --- LEER TODOS ---
  listar(filtros = {}) {
    let sql = `SELECT * FROM productos WHERE 1=1`;
    const params = [];

    if (filtros.categoria) {
      sql += ` AND categoria = ?`;
      params.push(filtros.categoria);
    }
    if (filtros.estado) {
      sql += ` AND estado = ?`;
      params.push(filtros.estado);
    }
    if (filtros.busqueda) {
      sql += ` AND (nombre LIKE ? OR descripcion LIKE ?)`;
      params.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
    }
    sql += ` ORDER BY fecha_creacion DESC`;
    return queryAll(sql, params);
  },

  // --- LEER UNO ---
  obtener(id) {
    return queryOne(`SELECT * FROM productos WHERE id = ?`, [id]);
  },

  // --- ACTUALIZAR ---
  actualizar(id, datos) {
    const { nombre, descripcion, precio, stock, categoria, estado } = datos;

    if (!nombre || nombre.trim() === '') throw new Error('El nombre es obligatorio.');
    if (precio < 0) throw new Error('El precio no puede ser negativo.');
    if (stock < 0) throw new Error('El stock no puede ser negativo.');

    // REGLA DE NEGOCIO: No duplicar nombre en misma categoría (excepto el mismo)
    const existe = queryOne(
      `SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?) AND categoria = ? AND id != ?`,
      [nombre.trim(), categoria, id]
    );
    if (existe) throw new Error(`Ya existe otro producto con ese nombre en "${categoria}".`);

    db.run(
      `UPDATE productos SET nombre=?, descripcion=?, precio=?, stock=?, categoria=?, estado=?
       WHERE id=?`,
      [nombre.trim(), descripcion || '', parseFloat(precio), parseInt(stock), categoria, estado, id]
    );
    saveDB();
    return { ok: true, mensaje: 'Producto actualizado correctamente.' };
  },

  // --- ELIMINAR ---
  eliminar(id) {
    // REGLA DE NEGOCIO: No eliminar si tiene reservas activas
    const reservasActivas = queryOne(
      `SELECT COUNT(*) as total FROM reservas 
       WHERE producto_id = ? AND estado IN ('pendiente','confirmada')`,
      [id]
    );
    if (reservasActivas && reservasActivas.total > 0) {
      throw new Error('No se puede eliminar: el producto tiene reservas activas. Cancélalas primero.');
    }

    db.run(`DELETE FROM productos WHERE id = ?`, [id]);
    saveDB();
    return { ok: true, mensaje: 'Producto eliminado correctamente.' };
  },

  // --- ESTADÍSTICAS ---
  estadisticas() {
    return {
      total: queryOne(`SELECT COUNT(*) as n FROM productos`).n,
      activos: queryOne(`SELECT COUNT(*) as n FROM productos WHERE estado='activo'`).n,
      sinStock: queryOne(`SELECT COUNT(*) as n FROM productos WHERE stock=0`).n,
      categorias: queryAll(`SELECT categoria, COUNT(*) as total FROM productos GROUP BY categoria`)
    };
  },

  categoriasUnicas() {
    return queryAll(`SELECT DISTINCT categoria FROM productos ORDER BY categoria`).map(r => r.categoria);
  }
};
