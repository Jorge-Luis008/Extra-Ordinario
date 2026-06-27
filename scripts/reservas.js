// reservas.js — CRUD de reservas

const Reservas = {

  crear(datos) {
    const { usuario_id, producto_id, cantidad, fecha_reserva, notas } = datos;
    if (!usuario_id) throw new Error('Debe seleccionar un usuario.');
    if (!producto_id) throw new Error('Debe seleccionar un producto.');
    if (!cantidad || cantidad < 1) throw new Error('La cantidad debe ser al menos 1.');
    if (!fecha_reserva) throw new Error('La fecha de reserva es obligatoria.');

    // REGLA: Stock suficiente
    if (!stockSuficiente(producto_id, cantidad)) {
      throw new Error('Stock insuficiente para esta reserva.');
    }

    // REGLA: Producto activo
    const prod = queryOne(`SELECT estado FROM productos WHERE id = ?`, [producto_id]);
    if (!prod || prod.estado !== 'activo') throw new Error('El producto no está disponible.');

    db.run(
      `INSERT INTO reservas (usuario_id, producto_id, cantidad, fecha_reserva, notas, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [usuario_id, producto_id, parseInt(cantidad), fecha_reserva, notas || '']
    );
    saveDB();
    return { ok: true, mensaje: 'Reserva creada correctamente.' };
  },

  listar(filtros = {}) {
    let sql = `
      SELECT r.*, u.nombre as usuario_nombre, p.nombre as producto_nombre, p.precio
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN productos p ON r.producto_id = p.id
      WHERE 1=1`;
    const params = [];
    if (filtros.estado) { sql += ` AND r.estado = ?`; params.push(filtros.estado); }
    if (filtros.usuario_id) { sql += ` AND r.usuario_id = ?`; params.push(filtros.usuario_id); }
    if (filtros.busqueda) {
      sql += ` AND (u.nombre LIKE ? OR p.nombre LIKE ?)`;
      params.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
    }
    sql += ` ORDER BY r.fecha_creacion DESC`;
    return queryAll(sql, params);
  },

  obtener(id) {
    return queryOne(`
      SELECT r.*, u.nombre as usuario_nombre, p.nombre as producto_nombre, p.precio
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN productos p ON r.producto_id = p.id
      WHERE r.id = ?`, [id]);
  },

  actualizar(id, datos) {
    const { cantidad, fecha_reserva, notas, estado } = datos;
    if (cantidad < 1) throw new Error('La cantidad debe ser al menos 1.');

    const actual = this.obtener(id);
    if (!actual) throw new Error('Reserva no encontrada.');

    // REGLA DE NEGOCIO: No editar reservas completadas o canceladas
    if (actual.estado === 'completada' || actual.estado === 'cancelada') {
      throw new Error(`No se puede modificar una reserva en estado "${actual.estado}".`);
    }

    // REGLA: Verificar stock si cambia cantidad
    if (parseInt(cantidad) !== actual.cantidad) {
      if (!stockSuficiente(actual.producto_id, cantidad, id)) {
        throw new Error('Stock insuficiente para la cantidad solicitada.');
      }
    }

    db.run(
      `UPDATE reservas SET cantidad=?, fecha_reserva=?, notas=?, estado=? WHERE id=?`,
      [parseInt(cantidad), fecha_reserva, notas || '', estado, id]
    );
    saveDB();
    return { ok: true, mensaje: 'Reserva actualizada correctamente.' };
  },

  eliminar(id) {
    // REGLA DE NEGOCIO: Solo eliminar canceladas o completadas
    if (!reservaEliminable(id)) {
      throw new Error('Solo se pueden eliminar reservas canceladas o completadas.');
    }
    db.run(`DELETE FROM reservas WHERE id = ?`, [id]);
    saveDB();
    return { ok: true, mensaje: 'Reserva eliminada.' };
  },

  estadisticas() {
    return {
      total: queryOne(`SELECT COUNT(*) as n FROM reservas`).n,
      porEstado: queryAll(`SELECT estado, COUNT(*) as total FROM reservas GROUP BY estado`),
      montoTotal: queryOne(`
        SELECT COALESCE(SUM(r.cantidad * p.precio), 0) as total
        FROM reservas r JOIN productos p ON r.producto_id = p.id
        WHERE r.estado IN ('confirmada','completada')`).total
    };
  }
};
