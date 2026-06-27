// catalogo.js — CRUD de catálogo de contenido

const Catalogo = {

  crear(datos) {
    const { titulo, tipo, autor, descripcion, url } = datos;
    if (!titulo || titulo.trim() === '') throw new Error('El título es obligatorio.');
    if (!tipo) throw new Error('El tipo de contenido es obligatorio.');
    if (!autor || autor.trim() === '') throw new Error('El autor es obligatorio.');

    // REGLA: No duplicar título + tipo
    const existe = queryOne(
      `SELECT id FROM catalogo WHERE LOWER(titulo) = LOWER(?) AND tipo = ?`,
      [titulo.trim(), tipo]
    );
    if (existe) throw new Error(`Ya existe un "${tipo}" con ese título.`);

    db.run(
      `INSERT INTO catalogo (titulo, tipo, autor, descripcion, url, estado)
       VALUES (?, ?, ?, ?, ?, 'publicado')`,
      [titulo.trim(), tipo, autor.trim(), descripcion || '', url || '']
    );
    saveDB();
    return { ok: true, mensaje: 'Contenido agregado al catálogo.' };
  },

  listar(filtros = {}) {
    let sql = `SELECT * FROM catalogo WHERE 1=1`;
    const params = [];
    if (filtros.tipo) { sql += ` AND tipo = ?`; params.push(filtros.tipo); }
    if (filtros.estado) { sql += ` AND estado = ?`; params.push(filtros.estado); }
    if (filtros.busqueda) {
      sql += ` AND (titulo LIKE ? OR autor LIKE ? OR descripcion LIKE ?)`;
      params.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
    }
    sql += ` ORDER BY fecha_publicacion DESC`;
    return queryAll(sql, params);
  },

  obtener(id) {
    return queryOne(`SELECT * FROM catalogo WHERE id = ?`, [id]);
  },

  actualizar(id, datos) {
    const { titulo, tipo, autor, descripcion, url, estado } = datos;
    if (!titulo || titulo.trim() === '') throw new Error('El título es obligatorio.');
    if (!autor || autor.trim() === '') throw new Error('El autor es obligatorio.');

    // REGLA: No duplicar título + tipo (excluyendo el propio)
    const existe = queryOne(
      `SELECT id FROM catalogo WHERE LOWER(titulo) = LOWER(?) AND tipo = ? AND id != ?`,
      [titulo.trim(), tipo, id]
    );
    if (existe) throw new Error(`Ya existe otro "${tipo}" con ese título.`);

    db.run(
      `UPDATE catalogo SET titulo=?, tipo=?, autor=?, descripcion=?, url=?, estado=? WHERE id=?`,
      [titulo.trim(), tipo, autor.trim(), descripcion || '', url || '', estado, id]
    );
    saveDB();
    return { ok: true, mensaje: 'Contenido actualizado correctamente.' };
  },

  eliminar(id) {
    const item = this.obtener(id);
    if (item && item.estado === 'publicado') {
      throw new Error('No se puede eliminar contenido publicado. Archívalo primero.');
    }
    db.run(`DELETE FROM catalogo WHERE id = ?`, [id]);
    saveDB();
    return { ok: true, mensaje: 'Contenido eliminado del catálogo.' };
  },

  estadisticas() {
    return {
      total: queryOne(`SELECT COUNT(*) as n FROM catalogo`).n,
      publicados: queryOne(`SELECT COUNT(*) as n FROM catalogo WHERE estado='publicado'`).n,
      porTipo: queryAll(`SELECT tipo, COUNT(*) as total FROM catalogo GROUP BY tipo`)
    };
  }
};
