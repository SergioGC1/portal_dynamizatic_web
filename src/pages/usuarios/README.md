# Página de Usuarios (`src/pages/usuarios/page.tsx`)

Cómo viajan los datos entre la tabla y el backend, en bloques sencillos.

## Estado y columnas
- `usuarios`, `totalUsuarios`: datos visibles y total para paginador server-side.
- `tablaPaginacion`: `{ first, rows }` → se traducen a `offset` y `limit` al llamar al back.
- `filtroBusquedaTemporal` / `filtroBusquedaAplicado`: lo que escribe el usuario vs. lo que se envía en la petición.
- `ordenTabla`: `campo` y `orden` (`1` ASC, `-1` DESC) que se mandan al back.
- `columnasDefinicion`: columnas con render de avatar y `activoSn`; indica cuáles son filtrables/ordenables.
- `referenciaTabla`: ref al `DataTable` para `downloadCSV`, `clearFilters`, `getColumnFilters`.

## Flujo de carga (backend)
- `cargarUsuarios({ first, rows, search, sortField, sortOrder, filters })`:
  - Construye `params` con paginación, búsqueda, orden y filtros de columna (normaliza booleanos a `S/N` y numéricos con `Number`).
  - Llama a `UsuariosAPI.findUsuarios(params)` (GET `/usuarios` con querystring).
  - Normaliza la respuesta: usa `respuesta.data/total` si viene objeto; si es array, usa el array y su `length`.
  - Actualiza lista, total y estado de paginación.
- `recargarUsuarios()`: reutiliza `cargarUsuarios` con el estado vigente (tras crear/editar/borrar).

## Integración con DataTable (lazy)
- El `DataTable` en modo `lazy` no filtra ni ordena en cliente: dispara `onLazyLoad` al paginar, ordenar o filtrar por columna.
- `onLazyLoad` reenvía `{ first, rows, sortField, sortOrder, filters }` a `cargarUsuarios`, así el back siempre recibe los valores actuales.
- `totalRecords={totalUsuarios}` alimenta el paginador del `DataTable`.

## Acciones y permisos
- Toolbar (`TableToolbar`): `onSearch`, `clearFilters` (limpia búsqueda y filtros de columna), `onNew`, `onDownloadCSV`.
- Fila: `onView`/`onEdit` abren panel; `onDelete` evita borrar al usuario logado y, si hay FK, desactiva (`activoSn='N'`).
- `usePermisos` controla qué acciones se muestran (`ver`, `editar`, `borrar`, `nuevo`, `rol`). El email del usuario actual evita borrarse a sí mismo.

## Panel de edición (GestorEditores)
- `onSave`: limpia payload (sin `_assignedRoles`, sin `password` en edición), aplica `rolId` sólo si hay permiso, llama a `register` o `updateUsuarioById`, y recarga al cerrar.
- `onUploadSuccess`: recarga lista y fuerza cache-bust en la imagen del usuario.
