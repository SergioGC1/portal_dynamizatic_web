# Página de Productos (`src/pages/productos/page.tsx`)

Cómo se conecta la tabla con el backend, explicado por bloques.

## Estado y columnas
- `productos`, `totalProductos`: datos visibles y total para el paginador server-side.
- `tablaPaginacion`: `{ first, rows }` → se traducen a `offset` y `limit` al llamar al back.
- `filtroBusquedaTemporal` / `filtroBusquedaAplicado`: texto escrito vs. lo que se envía.
- `ordenTabla`: `campo` y `orden` (`1` ASC, `-1` DESC) que se mandan al back.
- `columnasDefinicion`: columnas con render de estado, activo, etc.; marca qué es filtrable/ordenable.
- `estados`: catálogo cargado desde `estadosAPI` para mostrar labels en la columna `estadoId`.
- `referenciaTabla`: ref al `DataTable` para `downloadCSV`, `clearFilters`, `getColumnFilters`.

## Flujo de carga (backend)
- `cargarProductos({ first, rows, search, sortField, sortOrder, filters })`:
  - Construye `params` con paginación, búsqueda, orden y filtros de columna. Booleans/SN se normalizan a mayúsculas; números se convierten con `Number`.
  - Llama a `productosAPI.findProductos(params)` (GET `/productos` con querystring).
  - Normaliza la respuesta: usa `{data, total}` si viene objeto; si es array, usa el array y su `length`.
  - Actualiza lista, total y estado de paginación; marca `haBuscado` al completar.
- `recargarProductos()`: reutiliza `cargarProductos` con el estado vigente (tras crear/editar/borrar/subir imagen).

## Integración con DataTable (lazy)
- El `DataTable` en modo `lazy` dispara `onLazyLoad` al paginar, ordenar o filtrar; se reenvía `{ first, rows, sortField, sortOrder, filters }` a `cargarProductos`.
- `totalRecords={totalProductos}` alimenta el paginador.
- Orden inicial: si no hay uno elegido, toma la primera columna ordenable y la pone DESC.

## Acciones y permisos
- Toolbar: `onSearch`, `clearFilters` (limpia búsqueda + filtros de columna), `onNew`, `onDownloadCSV`.
- Fila: `onView`/`onEdit` abren panel (`GestorEditores`); `onDelete` confirma y recarga al terminar.
- `usePermisos` decide qué acciones se muestran (`ver`, `editar`, `borrar`, `nuevo`).

## Panel de edición
- Usa `GestorEditores` para ver/editar. `onSave` crea o actualiza y luego recarga. `onUploadSuccess` refresca la lista para mostrar la imagen nueva.
