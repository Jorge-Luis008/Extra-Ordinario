// Usuarios 

const Usuarios = {

  crear(datos) {
    const { nombre, email, rol } = datos;
    if (!nombre || nombre.trim() === '') throw new Error('El nombre es obligatorio.');
    if (!email || !email.includes('@')) throw new Error('Email inválido.');

    // REGLA DE NEGOCIO 1: Email único
    if (emailExiste(email)) throw new Error('Ya existe un usuario con ese email.');

    db.run(
      `INSERT INTO usuarios (nombre, email, rol, estado) VALUES (?, ?, ?, 'activo')`,
      [nombre.trim(), email.toLowerCase().trim(), rol || 'cliente']
    );
    saveDB();
    return { ok: true, mensaje: 'Usuario creado correctamente.' };
  },

  listar(filtros = {}) {
    let sql = `SELECT * FROM usuarios WHERE 1=1`;
    const params = [];
    if (filtros.rol) { sql += ` AND rol = ?`; params.push(filtros.rol); }
    if (filtros.estado) { sql += ` AND estado = ?`; params.push(filtros.estado); }
    if (filtros.busqueda) {
      sql += ` AND (nombre LIKE ? OR email LIKE ?)`;
      params.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
    }
    sql += ` ORDER BY fecha_registro DESC`;
    return queryAll(sql, params);
  },

  obtener(id) {
    return queryOne(`SELECT * FROM usuarios WHERE id = ?`, [id]);
  },

  actualizar(id, datos) {
    const { nombre, email, rol, estado } = datos;
    if (!nombre || nombre.trim() === '') throw new Error('El nombre es obligatorio.');
    if (!email || !email.includes('@')) throw new Error('Email inválido.');

    // REGLA: Email único (excluyendo el propio)
    if (emailExiste(email, id)) throw new Error('Ese email ya está en uso por otro usuario.');

    db.run(
      `UPDATE usuarios SET nombre=?, email=?, rol=?, estado=? WHERE id=?`,
      [nombre.trim(), email.toLowerCase().trim(), rol, estado, id]
    );
    saveDB();
    return { ok: true, mensaje: 'Usuario actualizado correctamente.' };
  },

  eliminar(id) {
    // No eliminar si tiene tareas o reservas
    const tieneTareas = queryOne(`SELECT COUNT(*) as n FROM tareas WHERE usuario_id = ?`, [id]).n;
    const tieneReservas = queryOne(`SELECT COUNT(*) as n FROM reservas WHERE usuario_id = ?`, [id]).n;
    if (tieneTareas > 0 || tieneReservas > 0) {
      throw new Error('No se puede eliminar: el usuario tiene tareas o reservas asociadas.');
    }
    db.run(`DELETE FROM usuarios WHERE id = ?`, [id]);
    saveDB();
    return { ok: true, mensaje: 'Usuario eliminado.' };
  },

  estadisticas() {
    return {
      total: queryOne(`SELECT COUNT(*) as n FROM usuarios`).n,
      activos: queryOne(`SELECT COUNT(*) as n FROM usuarios WHERE estado='activo'`).n,
      porRol: queryAll(`SELECT rol, COUNT(*) as total FROM usuarios GROUP BY rol`)
    };
  }
};