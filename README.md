# 🔳 DataFlow 🔳 - Sistema de Gestión 

Aplicación web de gestión de datos con operaciones CRUD completas, base de datos relacional SQLite y múltiples módulos de administración.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Productos** ⭐ | Entidad principal - CRUD completo con validaciones |
| **Usuarios** | Gestión de usuarios con roles y control de duplicados |
| **Tareas** | Administración de tareas con flujo de estados controlado |
| **Reservas** | Reservas de productos con verificación de stock |
| **Catálogo** | Biblioteca de contenido digital (libros, videos, cursos...) |

## 📜 Reglas de negocio que se implementaron.

1. **Validación de duplicidad** - No se permite registrar un producto con el mismo nombre en la misma categoría, ni un usuario con email ya existente.
2. **Control de estados en tareas** - Las tareas siguen un flujo unidireccional: `pendiente ▸ en_progreso ▸ completada`. No se puede revertir un estado.
3. **Integridad referencial en reservas** - No se puede eliminar un producto con reservas activas, ni eliminar una reserva que no esté cancelada o completada.
4. **Control de stock** - Al crear o editar una reserva, el sistema verifica que haya stock disponible considerando otras reservas activas.

## 💻Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript
- **Base de datos:** SQLite vía SQL.js (WebAssembly, cargado desde CDN)
- **Persistencia:** `localStorage` (exportación automática de la BD)

## ☑️Requisitos

> ⚠️⚠️ **SE REQUIERE CONEXION A INTERNET** ⚠️⚠️ La librería SQL.js se carga desde CDN (cdnjs.cloudflare.com). Sin conexión, la aplicación no podrá inicializar la base de datos.

## ❓Cómo ejecutar

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Jorge-Luis008/Extra-Ordinario.git
   ```
2. Asegúrate de tener **CONEXION INTERNET ACTIVA**.
3. Abre el archivo `index.html` directamente en tu navegador.

> No requiere servidor ni instalación de dependencias.

## Estructura del proyecto

```
Extra-Ordinario/
⊢-- index.html
⊢-- styles/
∣   ⨽-- styles.css
⊢-- scripts/
∣   ⊢-- db.js          # Inicialización de SQLite y reglas de negocio
∣   ⊢-- productos.js   # CRUD productos (entidad principal)
∣   ⊢-- usuarios.js    # CRUD usuarios
∣   ⊢-- tareas.js      # CRUD tareas
∣   ⊢-- reservas.js    # CRUD reservas
∣   ⊢-- catalogo.js    # CRUD catálogo de contenido
∣   ⨽-- main.js        # Lógica de UI y navegación
⨽-- libs/
    ⊢-- sql-wasm.js    # Puede conservarse como respaldo (no se usa con CDN)
    ⨽-- sql-wasm.wasm
```

## Notas

- Los datos se guardan automáticamente en el `localStorage` del navegador.
- Para reiniciar la base de datos: abrir DevTools ▸ Application ▸ Local Storage ▸ borrar la clave `appdb`.
