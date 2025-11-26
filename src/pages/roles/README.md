# Página de Roles (`src/pages/roles/page.tsx`)

Mini guía por bloques para entender la tabla y su conexión con el backend.

## Estado y columnas
- `roles`, `totalRoles`: datos visibles y total para el paginador server-side.
- `tablaPaginacion`: `{ first, rows }` → `offset` y `limit` al consultar el back.
- `filtroBusquedaTemporal` / `filtroBusquedaAplicado`: texto que escribe el usuario vs. el que se envía.
- `ordenTabla`: `campo` y `orden` (`1` ASC, `-1` DESC) que se mandan al back.
- `columnasDefinicion`: columnas (nombre, activo) con filtros y render de badge para `activoSn`.
- `referenciaTabla`: ref al `DataTable` (descarga CSV, limpiar filtros, etc.).

## Flujo de carga (backend)
- `cargarRoles({ first, rows, search, sortField, sortOrder, filters })`:
  - Monta `params` con paginación, búsqueda, orden y filtros de columna (`activoSn`).
  - Llama a `RolesAPI.findRoles(params)` (GET `/roles` con querystring).
  - Normaliza respuesta: usa `{data, total}` si viene objeto; si es array, usa el array y su `length`.
  - Actualiza lista, total y estado de paginación.
- `recargarRoles()`: reusa `cargarRoles` con el estado vigente (tras crear/editar/borrar).

## Integración con DataTable (lazy)
- El `DataTable` en modo `lazy` dispara `onLazyLoad` al paginar/ordenar/filtrar; ahí se reenvían `{ first, rows, sortField, sortOrder, filters }` a `cargarRoles`.
- `totalRecords={totalRoles}` alimenta el paginador server-side.
- Orden inicial: si no hay orden elegido, toma la primera columna ordenable y la pone DESC (coincide con la tabla).

## Acciones y permisos
- Toolbar: `onSearch`, `clearFilters`, `onNew`, `onDownloadCSV`.
- Fila: `onView`, `onEdit`, `onDelete` (con confirmación y aviso si el rol está asignado a usuarios).
- `usePermisos` controla qué acciones se muestran según el usuario logado.
