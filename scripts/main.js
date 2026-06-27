// main.js - Controlador principal de UI

let moduloActual = 'productos';

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  mostrarCargando(true);
  try {
    await initDB();
    configurarNavegacion();
    cargarModulo('productos');
  } catch (err) {
    mostrarError('Error al inicializar la base de datos: ' + err.message);
  } finally {
    mostrarCargando(false);
  }
});

function mostrarCargando(estado) {
  document.getElementById('loading-overlay').style.display = estado ? 'flex' : 'none';
}

// --- NAVEGACIÓN ---
function configurarNavegacion() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const modulo = link.dataset.modulo;
      cargarModulo(modulo);
    });
  });
}

function cargarModulo(modulo) {
  moduloActual = modulo;

  // Actualizar nav activo
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-modulo="${modulo}"]`)?.classList.add('active');

  // Ocultar todos los módulos
  document.querySelectorAll('.modulo').forEach(m => m.classList.remove('active'));
  document.getElementById(`modulo-${modulo}`)?.classList.add('active');

  // Renderizar el módulo
  switch (modulo) {
    case 'productos':  renderProductos(); break;
    case 'usuarios':   renderUsuarios(); break;
    case 'tareas':     renderTareas(); break;
    case 'reservas':   renderReservas(); break;
    case 'catalogo':   renderCatalogo(); break;
  }
}

// --- NOTIFICACIONES ---
function toast(msg, tipo = 'success') {
  const cont = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.innerHTML = `<span class="toast-icon">${tipo === 'success' ? '✓' : '✕'}</span>${msg}`;
  cont.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function mostrarError(msg) { toast(msg, 'error'); }
function mostrarExito(msg) { toast(msg, 'success'); }

// --- MODAL ---
function abrirModal(titulo, htmlContenido, onGuardar) {
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-body').innerHTML = htmlContenido;
  document.getElementById('modal-overlay').classList.add('active');

  // Clonar el botón para eliminar cualquier listener previo acumulado
  const btnViejo = document.getElementById('modal-guardar');
  const btnNuevo = btnViejo.cloneNode(true);
  btnViejo.parentNode.replaceChild(btnNuevo, btnViejo);

  btnNuevo.addEventListener('click', () => {
    try { onGuardar(); }
    catch (err) { mostrarError(err.message); }
  });
}

function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

document.addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') cerrarModal();
});

// --- CONFIRMAR ELIMINACIÓN ---
function confirmarEliminar(msg, onConfirm) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').classList.add('active');
  document.getElementById('confirm-ok').onclick = () => {
    cerrarConfirm();
    try { onConfirm(); }
    catch (err) { mostrarError(err.message); }
  };
}
function cerrarConfirm() {
  document.getElementById('confirm-overlay').classList.remove('active');
}

// =====================================================
// MÓDULO: PRODUCTOS (entidad principal — CRUD completo)
// =====================================================
function renderProductos() {
  const stats = Productos.estadisticas();
  const categorias = Productos.categoriasUnicas();
  const filtrosBusqueda = document.getElementById('prod-busqueda')?.value || '';
  const filtrosCateg = document.getElementById('prod-filtro-categ')?.value || '';
  const filtrosEstado = document.getElementById('prod-filtro-estado')?.value || '';

  const lista = Productos.listar({
    busqueda: filtrosBusqueda, categoria: filtrosCateg, estado: filtrosEstado
  });

  const contenedor = document.getElementById('modulo-productos');
  contenedor.innerHTML = `
    <div class="modulo-header">
      <div>
        <h2 class="modulo-titulo">Gestión de Productos</h2>
        <p class="modulo-subtitulo">Entidad principal — CRUD completo</p>
      </div>
      <button class="btn btn-primary" onclick="formProducto()">+ Nuevo Producto</button>
    </div>

    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">${stats.total}</span><span class="stat-label">Total</span></div>
      <div class="stat-card accent"><span class="stat-num">${stats.activos}</span><span class="stat-label">Activos</span></div>
      <div class="stat-card warn"><span class="stat-num">${stats.sinStock}</span><span class="stat-label">Sin Stock</span></div>
    </div>

    <div class="filtros-bar">
      <input class="input-filter" id="prod-busqueda" placeholder="Buscar producto..." 
        value="${filtrosBusqueda}" oninput="renderProductos()">
      <select class="input-filter" id="prod-filtro-categ" onchange="renderProductos()">
        <option value="">Todas las categorías</option>
        ${categorias.map(c => `<option ${filtrosCateg===c?'selected':''}>${c}</option>`).join('')}
      </select>
      <select class="input-filter" id="prod-filtro-estado" onchange="renderProductos()">
        <option value="">Todos los estados</option>
        <option value="activo" ${filtrosEstado==='activo'?'selected':''}>Activo</option>
        <option value="inactivo" ${filtrosEstado==='inactivo'?'selected':''}>Inactivo</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="tabla">
        <thead><tr>
          <th>ID</th><th>Nombre</th><th>Categoría</th>
          <th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          ${lista.length === 0 ? `<tr><td colspan="7" class="empty">No hay productos que mostrar.</td></tr>` :
            lista.map(p => `
              <tr>
                <td>#${p.id}</td>
                <td><strong>${p.nombre}</strong><br><small class="muted">${p.descripcion || ''}</small></td>
                <td><span class="badge badge-blue">${p.categoria}</span></td>
                <td>$${parseFloat(p.precio).toFixed(2)}</td>
                <td><span class="${p.stock === 0 ? 'badge badge-red' : 'badge badge-green'}">${p.stock}</span></td>
                <td><span class="badge ${p.estado==='activo'?'badge-green':'badge-gray'}">${p.estado}</span></td>
                <td class="acciones">
                  <button class="btn btn-sm btn-outline" onclick="formProducto(${p.id})">Editar</button>
                  <button class="btn btn-sm btn-danger" data-id="${p.id}" data-nombre="${p.nombre}" onclick="eliminarProducto(this)">Eliminar</button>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="tabla-count">${lista.length} producto(s) encontrado(s)</p>
  `;
}

function formProducto(id = null) {
  const p = id ? Productos.obtener(id) : null;
  const categorias = ['Electrónica', 'Periféricos', 'Software', 'Accesorios', 'Ropa', 'Alimentos', 'Hogar', 'Otro'];
  const html = `
    <div class="form-grid">
      <div class="form-group full">
        <label>Nombre *</label>
        <input id="f-nombre" class="input" value="${p?.nombre||''}" placeholder="Nombre del producto">
      </div>
      <div class="form-group full">
        <label>Descripción</label>
        <textarea id="f-desc" class="input textarea" rows="2">${p?.descripcion||''}</textarea>
      </div>
      <div class="form-group">
        <label>Precio ($) *</label>
        <input id="f-precio" class="input" type="number" step="0.01" min="0" value="${p?.precio||''}">
      </div>
      <div class="form-group">
        <label>Stock *</label>
        <input id="f-stock" class="input" type="number" min="0" value="${p?.stock||'0'}">
      </div>
      <div class="form-group">
        <label>Categoría *</label>
        <select id="f-categ" class="input">
          ${categorias.map(c => `<option ${p?.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      ${id ? `
      <div class="form-group">
        <label>Estado</label>
        <select id="f-estado" class="input">
          <option value="activo" ${p?.estado==='activo'?'selected':''}>Activo</option>
          <option value="inactivo" ${p?.estado==='inactivo'?'selected':''}>Inactivo</option>
        </select>
      </div>` : ''}
    </div>`;

  abrirModal(id ? 'Editar Producto' : 'Nuevo Producto', html, () => {
    const datos = {
      nombre: document.getElementById('f-nombre').value,
      descripcion: document.getElementById('f-desc').value,
      precio: document.getElementById('f-precio').value,
      stock: document.getElementById('f-stock').value,
      categoria: document.getElementById('f-categ').value,
      estado: id ? document.getElementById('f-estado').value : 'activo'
    };
    const result = id ? Productos.actualizar(id, datos) : Productos.crear(datos);
    mostrarExito(result.mensaje);
    cerrarModal();
    renderProductos();
  });
}

function eliminarProducto(btn) {
  const id = btn.dataset.id;
  const nombre = btn.dataset.nombre;
  confirmarEliminar(`¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`, () => {
    const result = Productos.eliminar(id);
    mostrarExito(result.mensaje);
    renderProductos();
  });
}

// ================
// MÓDULO: USUARIOS
// ================
function renderUsuarios() {
  const stats = Usuarios.estadisticas();
  const busqueda = document.getElementById('us-busqueda')?.value || '';
  const lista = Usuarios.listar({ busqueda });

  document.getElementById('modulo-usuarios').innerHTML = `
    <div class="modulo-header">
      <div>
        <h2 class="modulo-titulo">Gestión de Usuarios</h2>
        <p class="modulo-subtitulo">Control de acceso y roles</p>
      </div>
      <button class="btn btn-primary" onclick="formUsuario()">+ Nuevo Usuario</button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">${stats.total}</span><span class="stat-label">Total</span></div>
      <div class="stat-card accent"><span class="stat-num">${stats.activos}</span><span class="stat-label">Activos</span></div>
    </div>
    <div class="filtros-bar">
      <input class="input-filter" id="us-busqueda" placeholder="Buscar por nombre o email..." 
        value="${busqueda}" oninput="renderUsuarios()">
    </div>
    <div class="table-wrap">
      <table class="tabla">
        <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${lista.length === 0 ? `<tr><td colspan="6" class="empty">No hay usuarios.</td></tr>` :
            lista.map(u => `<tr>
              <td>#${u.id}</td>
              <td>${u.nombre}</td>
              <td class="muted">${u.email}</td>
              <td><span class="badge badge-blue">${u.rol}</span></td>
              <td><span class="badge ${u.estado==='activo'?'badge-green':'badge-gray'}">${u.estado}</span></td>
              <td class="acciones">
                <button class="btn btn-sm btn-outline" onclick="formUsuario(${u.id})">Editar</button>
                <button class="btn btn-sm btn-danger" data-id="${u.id}" data-nombre="${u.nombre}" onclick="eliminarUsuario(this)">Eliminar</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function formUsuario(id = null) {
  const u = id ? Usuarios.obtener(id) : null;
  const html = `
    <div class="form-grid">
      <div class="form-group full"><label>Nombre *</label>
        <input id="f-nombre" class="input" value="${u?.nombre||''}"></div>
      <div class="form-group full"><label>Email *</label>
        <input id="f-email" class="input" type="email" value="${u?.email||''}"></div>
      <div class="form-group"><label>Rol</label>
        <select id="f-rol" class="input">
          ${['admin','cliente','editor'].map(r => `<option ${u?.rol===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
      ${id ? `<div class="form-group"><label>Estado</label>
        <select id="f-estado" class="input">
          <option value="activo" ${u?.estado==='activo'?'selected':''}>Activo</option>
          <option value="inactivo" ${u?.estado==='inactivo'?'selected':''}>Inactivo</option>
        </select></div>` : ''}
    </div>`;

  abrirModal(id ? 'Editar Usuario' : 'Nuevo Usuario', html, () => {
    const datos = {
      nombre: document.getElementById('f-nombre').value,
      email: document.getElementById('f-email').value,
      rol: document.getElementById('f-rol').value,
      estado: id ? document.getElementById('f-estado').value : 'activo'
    };
    const result = id ? Usuarios.actualizar(id, datos) : Usuarios.crear(datos);
    mostrarExito(result.mensaje);
    cerrarModal();
    renderUsuarios();
  });
}

function eliminarUsuario(btn) {
  const id = btn.dataset.id;
  const nombre = btn.dataset.nombre;
  confirmarEliminar(`¿Eliminar al usuario "${nombre}"?`, () => {
    const result = Usuarios.eliminar(id);
    mostrarExito(result.mensaje);
    renderUsuarios();
  });
}

// ==============
// MÓDULO: TAREAS
// ==============
function renderTareas() {
  const busqueda = document.getElementById('ta-busqueda')?.value || '';
  const filtroEstado = document.getElementById('ta-filtro-estado')?.value || '';
  const lista = Tareas.listar({ busqueda, estado: filtroEstado });
  const stats = Tareas.estadisticas();

  const colores = { pendiente:'badge-yellow', en_progreso:'badge-blue', completada:'badge-green', cancelada:'badge-gray' };
  const coloresPrio = { alta:'badge-red', media:'badge-yellow', baja:'badge-gray' };

  document.getElementById('modulo-tareas').innerHTML = `
    <div class="modulo-header">
      <div><h2 class="modulo-titulo">Gestión de Tareas</h2>
        <p class="modulo-subtitulo">Flujo de estados controlado</p></div>
      <button class="btn btn-primary" onclick="formTarea()">+ Nueva Tarea</button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">${stats.total}</span><span class="stat-label">Total</span></div>
      ${stats.porEstado.map(s => `
        <div class="stat-card"><span class="stat-num">${s.total}</span><span class="stat-label">${s.estado}</span></div>`).join('')}
    </div>
    <div class="filtros-bar">
      <input class="input-filter" id="ta-busqueda" placeholder="Buscar tarea..." 
        value="${busqueda}" oninput="renderTareas()">
      <select class="input-filter" id="ta-filtro-estado" onchange="renderTareas()">
        <option value="">Todos los estados</option>
        ${['pendiente','en_progreso','completada','cancelada'].map(e => 
          `<option value="${e}" ${filtroEstado===e?'selected':''}>${e}</option>`).join('')}
      </select>
    </div>
    <div class="table-wrap">
      <table class="tabla">
        <thead><tr><th>ID</th><th>Título</th><th>Prioridad</th><th>Estado</th><th>Asignado</th><th>Límite</th><th>Acciones</th></tr></thead>
        <tbody>
          ${lista.length === 0 ? `<tr><td colspan="7" class="empty">No hay tareas.</td></tr>` :
            lista.map(t => `<tr>
              <td>#${t.id}</td>
              <td><strong>${t.titulo}</strong></td>
              <td><span class="badge ${coloresPrio[t.prioridad]}">${t.prioridad}</span></td>
              <td><span class="badge ${colores[t.estado]}">${t.estado}</span></td>
              <td class="muted">${t.usuario_nombre || '—'}</td>
              <td class="muted">${t.fecha_limite || '—'}</td>
              <td class="acciones">
                <button class="btn btn-sm btn-outline" onclick="formTarea(${t.id})">Editar</button>
                <button class="btn btn-sm btn-danger" data-id="${t.id}" data-nombre="${t.titulo}" onclick="eliminarTarea(this)">Eliminar</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function formTarea(id = null) {
  const t = id ? Tareas.obtener(id) : null;
  const usuarios = Usuarios.listar({ estado: 'activo' });
  const estadosValidos = id ? ['pendiente', ...Tareas.transicionesValidas(t?.estado)] : ['pendiente'];
  const html = `
    <div class="form-grid">
      <div class="form-group full"><label>Título *</label>
        <input id="f-titulo" class="input" value="${t?.titulo||''}"></div>
      <div class="form-group full"><label>Descripción</label>
        <textarea id="f-desc" class="input textarea" rows="2">${t?.descripcion||''}</textarea></div>
      <div class="form-group"><label>Prioridad</label>
        <select id="f-prio" class="input">
          ${['baja','media','alta'].map(p => `<option ${t?.prioridad===p?'selected':''}>${p}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Estado</label>
        <select id="f-estado" class="input">
          ${id ? estadosValidos.map(e => `<option value="${e}" ${t?.estado===e?'selected':''}>${e}</option>`).join('')
               : `<option value="pendiente">pendiente</option>`}
        </select></div>
      <div class="form-group"><label>Asignado a</label>
        <select id="f-user" class="input">
          <option value="">Sin asignar</option>
          ${usuarios.map(u => `<option value="${u.id}" ${t?.usuario_id==u.id?'selected':''}>${u.nombre}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Fecha límite</label>
        <input id="f-fecha" class="input" type="date" value="${t?.fecha_limite||''}"></div>
    </div>`;

  abrirModal(id ? 'Editar Tarea' : 'Nueva Tarea', html, () => {
    const datos = {
      titulo: document.getElementById('f-titulo').value,
      descripcion: document.getElementById('f-desc').value,
      prioridad: document.getElementById('f-prio').value,
      estado: document.getElementById('f-estado').value,
      usuario_id: document.getElementById('f-user').value || null,
      fecha_limite: document.getElementById('f-fecha').value || null
    };
    const result = id ? Tareas.actualizar(id, datos) : Tareas.crear(datos);
    mostrarExito(result.mensaje);
    cerrarModal();
    renderTareas();
  });
}

function eliminarTarea(btn) {
  const id = btn.dataset.id;
  const nombre = btn.dataset.nombre;
  confirmarEliminar(`¿Eliminar la tarea "${nombre}"?`, () => {
    const result = Tareas.eliminar(id);
    mostrarExito(result.mensaje);
    renderTareas();
  });
}

// ================
// MÓDULO: RESERVAS
// ================
function renderReservas() {
  const busqueda = document.getElementById('re-busqueda')?.value || '';
  const filtroEstado = document.getElementById('re-filtro-estado')?.value || '';
  const lista = Reservas.listar({ busqueda, estado: filtroEstado });
  const stats = Reservas.estadisticas();
  const colores = { pendiente:'badge-yellow', confirmada:'badge-blue', cancelada:'badge-gray', completada:'badge-green' };

  document.getElementById('modulo-reservas').innerHTML = `
    <div class="modulo-header">
      <div><h2 class="modulo-titulo">Gestión de Reservas</h2>
        <p class="modulo-subtitulo">Reservas de productos con control de stock</p></div>
      <button class="btn btn-primary" onclick="formReserva()">+ Nueva Reserva</button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">${stats.total}</span><span class="stat-label">Total</span></div>
      <div class="stat-card accent"><span class="stat-num">$${parseFloat(stats.montoTotal).toFixed(2)}</span><span class="stat-label">Monto confirmado</span></div>
    </div>
    <div class="filtros-bar">
      <input class="input-filter" id="re-busqueda" placeholder="Buscar por usuario o producto..." 
        value="${busqueda}" oninput="renderReservas()">
      <select class="input-filter" id="re-filtro-estado" onchange="renderReservas()">
        <option value="">Todos los estados</option>
        ${['pendiente','confirmada','cancelada','completada'].map(e =>
          `<option value="${e}" ${filtroEstado===e?'selected':''}>${e}</option>`).join('')}
      </select>
    </div>
    <div class="table-wrap">
      <table class="tabla">
        <thead><tr><th>ID</th><th>Usuario</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
        <tbody>
          ${lista.length === 0 ? `<tr><td colspan="8" class="empty">No hay reservas.</td></tr>` :
            lista.map(r => `<tr>
              <td>#${r.id}</td>
              <td>${r.usuario_nombre}</td>
              <td>${r.producto_nombre}</td>
              <td>${r.cantidad}</td>
              <td>$${(r.cantidad * r.precio).toFixed(2)}</td>
              <td><span class="badge ${colores[r.estado]}">${r.estado}</span></td>
              <td class="muted">${r.fecha_reserva}</td>
              <td class="acciones">
                <button class="btn btn-sm btn-outline" onclick="formReserva(${r.id})">Editar</button>
                <button class="btn btn-sm btn-danger" data-id="${r.id}" onclick="eliminarReserva(this)">Eliminar</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function formReserva(id = null) {
  const r = id ? Reservas.obtener(id) : null;
  const usuarios = Usuarios.listar({ estado: 'activo' });
  const productos = Productos.listar({ estado: 'activo' });
  const hoy = new Date().toISOString().split('T')[0];

  const html = `
    <div class="form-grid">
      <div class="form-group"><label>Usuario *</label>
        <select id="f-user" class="input" ${id?'disabled':''}>
          <option value="">Seleccionar...</option>
          ${usuarios.map(u => `<option value="${u.id}" ${r?.usuario_id==u.id?'selected':''}>${u.nombre}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Producto *</label>
        <select id="f-prod" class="input" ${id?'disabled':''}>
          <option value="">Seleccionar...</option>
          ${productos.map(p => `<option value="${p.id}" ${r?.producto_id==p.id?'selected':''}>${p.nombre} (stock: ${p.stock})</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Cantidad *</label>
        <input id="f-cant" class="input" type="number" min="1" value="${r?.cantidad||1}"></div>
      <div class="form-group"><label>Fecha *</label>
        <input id="f-fecha" class="input" type="date" value="${r?.fecha_reserva||hoy}"></div>
      ${id ? `<div class="form-group"><label>Estado</label>
        <select id="f-estado" class="input">
          ${['pendiente','confirmada','cancelada','completada'].map(e =>
            `<option value="${e}" ${r?.estado===e?'selected':''}>${e}</option>`).join('')}
        </select></div>` : ''}
      <div class="form-group full"><label>Notas</label>
        <textarea id="f-notas" class="input textarea" rows="2">${r?.notas||''}</textarea></div>
    </div>`;

  abrirModal(id ? 'Editar Reserva' : 'Nueva Reserva', html, () => {
    const datos = {
      usuario_id: id ? r.usuario_id : document.getElementById('f-user').value,
      producto_id: id ? r.producto_id : document.getElementById('f-prod').value,
      cantidad: document.getElementById('f-cant').value,
      fecha_reserva: document.getElementById('f-fecha').value,
      notas: document.getElementById('f-notas').value,
      estado: id ? document.getElementById('f-estado').value : 'pendiente'
    };
    const result = id ? Reservas.actualizar(id, datos) : Reservas.crear(datos);
    mostrarExito(result.mensaje);
    cerrarModal();
    renderReservas();
  });
}

function eliminarReserva(btn) {
  const id = btn.dataset.id;
  confirmarEliminar('¿Eliminar esta reserva? Solo se pueden eliminar reservas canceladas o completadas.', () => {
    const result = Reservas.eliminar(id);
    mostrarExito(result.mensaje);
    renderReservas();
  });
}

// ================
// MÓDULO: CATÁLOGO
// ================
function renderCatalogo() {
  const busqueda = document.getElementById('cat-busqueda')?.value || '';
  const filtroTipo = document.getElementById('cat-filtro-tipo')?.value || '';
  const lista = Catalogo.listar({ busqueda, tipo: filtroTipo });
  const stats = Catalogo.estadisticas();
  const iconos = { libro:'📚', video:'🎬', curso:'🎓', articulo:'📝', podcast:'🎙️' };
  const colores = { publicado:'badge-green', borrador:'badge-yellow', archivado:'badge-gray' };

  document.getElementById('modulo-catalogo').innerHTML = `
    <div class="modulo-header">
      <div><h2 class="modulo-titulo">Catálogo de Contenido</h2>
        <p class="modulo-subtitulo">Biblioteca de recursos digitales</p></div>
      <button class="btn btn-primary" onclick="formCatalogo()">+ Agregar Contenido</button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">${stats.total}</span><span class="stat-label">Total</span></div>
      <div class="stat-card accent"><span class="stat-num">${stats.publicados}</span><span class="stat-label">Publicados</span></div>
    </div>
    <div class="filtros-bar">
      <input class="input-filter" id="cat-busqueda" placeholder="Buscar por título o autor..." 
        value="${busqueda}" oninput="renderCatalogo()">
      <select class="input-filter" id="cat-filtro-tipo" onchange="renderCatalogo()">
        <option value="">Todos los tipos</option>
        ${['libro','video','curso','articulo','podcast'].map(t =>
          `<option value="${t}" ${filtroTipo===t?'selected':''}>${iconos[t]} ${t}</option>`).join('')}
      </select>
    </div>
    <div class="cards-grid">
      ${lista.length === 0 ? `<p class="empty">No hay contenido en el catálogo.</p>` :
        lista.map(c => `
          <div class="content-card">
            <div class="content-card-top">
              <span class="content-icon">${iconos[c.tipo]||'📄'}</span>
              <span class="badge ${colores[c.estado]}">${c.estado}</span>
            </div>
            <h3 class="content-titulo">${c.titulo}</h3>
            <p class="content-autor">por ${c.autor}</p>
            <p class="content-desc muted">${c.descripcion||''}</p>
            <div class="content-actions">
              <button class="btn btn-sm btn-outline" onclick="formCatalogo(${c.id})">Editar</button>
              <button class="btn btn-sm btn-danger" data-id="${c.id}" data-nombre="${c.titulo}" onclick="eliminarCatalogo(this)">Eliminar</button>
            </div>
          </div>`).join('')}
    </div>`;
}

function formCatalogo(id = null) {
  const c = id ? Catalogo.obtener(id) : null;
  const html = `
    <div class="form-grid">
      <div class="form-group full"><label>Título *</label>
        <input id="f-titulo" class="input" value="${c?.titulo||''}"></div>
      <div class="form-group"><label>Tipo *</label>
        <select id="f-tipo" class="input">
          ${['libro','video','curso','articulo','podcast'].map(t =>
            `<option value="${t}" ${c?.tipo===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Autor *</label>
        <input id="f-autor" class="input" value="${c?.autor||''}"></div>
      <div class="form-group full"><label>Descripción</label>
        <textarea id="f-desc" class="input textarea" rows="2">${c?.descripcion||''}</textarea></div>
      <div class="form-group full"><label>URL (opcional)</label>
        <input id="f-url" class="input" type="url" value="${c?.url||''}"></div>
      ${id ? `<div class="form-group"><label>Estado</label>
        <select id="f-estado" class="input">
          ${['borrador','publicado','archivado'].map(e =>
            `<option value="${e}" ${c?.estado===e?'selected':''}>${e}</option>`).join('')}
        </select></div>` : ''}
    </div>`;

  abrirModal(id ? 'Editar Contenido' : 'Agregar Contenido', html, () => {
    const datos = {
      titulo: document.getElementById('f-titulo').value,
      tipo: document.getElementById('f-tipo').value,
      autor: document.getElementById('f-autor').value,
      descripcion: document.getElementById('f-desc').value,
      url: document.getElementById('f-url').value,
      estado: id ? document.getElementById('f-estado').value : 'publicado'
    };
    const result = id ? Catalogo.actualizar(id, datos) : Catalogo.crear(datos);
    mostrarExito(result.mensaje);
    cerrarModal();
    renderCatalogo();
  });
}

function eliminarCatalogo(btn) {
  const id = btn.dataset.id;
  const nombre = btn.dataset.nombre;
  confirmarEliminar(`¿Eliminar "${nombre}"? Solo se puede si no está publicado.`, () => {
    const result = Catalogo.eliminar(id);
    mostrarExito(result.mensaje);
    renderCatalogo();
  });
}
