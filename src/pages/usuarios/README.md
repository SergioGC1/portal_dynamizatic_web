# Página de Usuarios (`src/pages/usuarios/page.tsx`)

Guía rápida por bloques: qué hace cada variable y función.

## Tabla (datos, paginación, filtros)
- `usuarios`: registros mostrados.  
- `totalUsuarios`: total para el paginador server-side.  
- `tablaPaginacion`: `{ first, rows }` controla `offset` y `limit` (selector 5/10/20).  
- `filtroBusquedaTemporal`: lo que escribe el usuario.  
- `filtroBusquedaAplicado`: lo que se envía al backend al pulsar “Buscar”.  
- `columnasDefinicion`: definición de columnas, títulos, filtros y renders (incluye avatar y `activoSn`).  
- `referenciaTabla`: ref del `DataTable` (`downloadCSV`, `clearFilters`, `getColumnFilters`).  
- `haBuscado`: evita precarga; hasta pulsar “Buscar” no se llama al backend.  
- `estaCargando` / `mensajeError`: estado de carga y error.

## Carga de datos (backend)
- `cargarUsuarios({ first, rows, search, sortField, sortOrder, filters })`: llama a `UsuariosAPI.findUsuarios` con paginación, orden y filtros (`activoSn`). Normaliza en línea: usa `respuesta.data` o el array plano y calcula `total` con `respuesta.total` o con `length`.  
- `recargarUsuarios()`: wrapper que llama a `cargarUsuarios` con el estado actual (tras guardar/borrar).  
- `onSearch` en la toolbar aplica `filtroBusquedaTemporal` → `filtroBusquedaAplicado` y resetea a la página 1.

## Integración DataTable
- Modo `lazy`: `onLazyLoad` se dispara al paginar/ordenar/filtrar y re-llama a `cargarUsuarios` con los nuevos `first`, `rows`, `sortField`, `sortOrder` y filtros de columna (`getColumnFilters`).  
- Paginador usa `rows` del estado y `totalRecords = totalUsuarios`.  
- `allowDelete`: oculta borrar si la fila es del usuario logado.

## Acciones
- Toolbar: `onSearch`, `clearFilters` (limpia búsqueda y filtros de columna), `onNew`, `onDownloadCSV`.  
- Fila: `onView`, `onEdit` abren panel; `onDelete` protege al usuario logado, intenta borrar credenciales y luego el usuario; si hay FK, desactiva (`activoSn='N'`).

## Permisos y usuario actual
- `usuarioAutenticado` / `emailUsuarioActual`: de `useAuth` o localStorage, para bloquear borrado propio.  
- `tienePermiso`: helper de `usePermisos` para mostrar/ocultar acciones (`ver`, `editar`, `borrar`, `nuevo`, `rol`).

## Panel de edición (`GestorEditores`)
- `onUploadSuccess`: refresca lista y añade cache-bust a la imagen del usuario actualizado.  
- `onClose`: cierra panel y recarga.  
- `onSave`: limpia payload (sin `_assignedRoles`, sin `password` en edición); aplica `rolId` solo si hay permiso; usa `updateUsuarioById` o `register`; recarga al terminar.

## Utilidades de imagen/identidad
- `construirUrlImagen(ruta)`: compone la URL final con base de API y cache-bust.  
- `obtenerInicialesUsuario(nombre, apellidos)`: genera iniciales para el avatar placeholder.
