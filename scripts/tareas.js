// Tareas a realizar - CRUD incluido
const Tareas = {

  crear(datos) {
    const { titulo, descripcion, prioridad, usuario_id, fecha_limite } = datos;
    if (!titulo || titulo.trim() === '') throw new Error('El título es obligatorio.');

    db.run(
      `INSERT INTO tareas (titulo, descripcion, estado, prioridad, usuario_id, fecha_limite)
       VALUES (?, ?, 'pendiente', ?, ?, ?)`,
      [titulo.trim(), descripcion || '', prioridad || 'media',
       usuario_id || null, fecha_limite || null]
    );
    saveDB();
    return { ok: true, mensaje: 'Tarea creada correctamente.' };
  },

  listar(filtros = {}) {
    let sql = `
      SELECT t.*, u.nombre as usuario_nombre 
      FROM tareas t LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE 1=1`;
    const params = [];
    if (filtros.estado) { sql += ` AND t.estado = ?`; params.push(filtros.estado); }
    if (filtros.prioridad) { sql += ` AND t.prioridad = ?`; params.push(filtros.prioridad); }
    if (filtros.usuario_id) { sql += ` AND t.usuario_id = ?`; params.push(filtros.usuario_id); }
    if (filtros.busqueda) {
      sql += ` AND t.titulo LIKE ?`; params.push(`%${filtros.busqueda}%`);
    }
    sql += ` ORDER BY 
      CASE t.prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      t.fecha_creacion DESC`;
    return queryAll(sql, params);
  },

  obtener(id) {
    return queryOne(`
      SELECT t.*, u.nombre as usuario_nombre 
      FROM tareas t LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.id = ?`, [id]);
  },

  actualizar(id, datos) {
    const { titulo, descripcion, estado, prioridad, usuario_id, fecha_limite } = datos;
    if (!titulo || titulo.trim() === '') throw new Error('El título es obligatorio.');

    // REGLA DE NEGOCIO 2: Control de flujo de estados
    const actual = this.obtener(id);
    if (!actual) throw new Error('Tarea no encontrada.');
    if (estado !== actual.estado && !cambioEstadoValido(actual.estado, estado)) {
      throw new Error(`No se puede cambiar de "${actual.estado}" a "${estado}". Flujo inválido.`);
    }

    db.run(
      `UPDATE tareas SET titulo=?, descripcion=?, estado=?, prioridad=?, usuario_id=?, fecha_limite=?
       WHERE id=?`,
      [titulo.trim(), descripcion || '', estado, prioridad,
       usuario_id || null, fecha_limite || null, id]
    );
    saveDB();
    return { ok: true, mensaje: 'Tarea actualizada correctamente.' };
  },

  eliminar(id) {
    const tarea = this.obtener(id);
    if (tarea && tarea.estado === 'en_progreso') {
      throw new Error('No se puede eliminar una tarea en progreso. Cancélala primero.');
    }
    db.run(`DELETE FROM tareas WHERE id = ?`, [id]);
    saveDB();
    return { ok: true, mensaje: 'Tarea eliminada.' };
  },

  estadisticas() {
    return {
      total: queryOne(`SELECT COUNT(*) as n FROM tareas`).n,
      porEstado: queryAll(`SELECT estado, COUNT(*) as total FROM tareas GROUP BY estado`),
      porPrioridad: queryAll(`SELECT prioridad, COUNT(*) as total FROM tareas GROUP BY prioridad`)
    };
  },

  // Devuelve transiciones válidas desde un estado
  transicionesValidas(estadoActual) {
    return FLUJO_ESTADOS_TAREA[estadoActual] || [];
  }
};