# Página de Fases (`src/pages/fases/page.tsx`)

Resumen por bloques de cómo la tabla habla con el backend.

## Estado y columnas
- `fases`, `totalFases`: datos visibles y total para paginador server-side.
- `tablaPaginacion`: `{ first, rows }` → se usan como `offset` y `limit` al consultar el back.
- `filtroBusquedaTemporal` / `filtroBusquedaAplicado`: texto escrito vs. lo que se envía.
- `ordenTabla`: `campo` y `orden` (`1` ASC, `-1` DESC) que se mandan al back.
- `columnasDefinicion`: columnas de fase (código, nombre, descripción, activo, estado); marca qué es filtrable/ordenable.
- `referenciaTabla`: ref al `DataTable` para CSV y limpiar filtros.

## Flujo de carga (backend)
- `cargarFases({ first, rows, search, sortField, sortOrder, filters })`:
  - Arma `params` con paginación, búsqueda, orden y filtros de columna (normaliza booleans a `S/N` y numéricos con `Number`).
  - Llama a `FasesAPI.findFases(params)` (GET `/fases` con querystring).
  - Normaliza la respuesta: usa `{data, total}` si viene objeto; si es array, usa el array y su `length`.
  - Actualiza lista, total y estado de paginación; marca `haBuscado` al completar.
- `recargarFases()`: reutiliza `cargarFases` con el estado actual (tras crear/editar/borrar).

## Integración con DataTable (lazy)
- En modo `lazy`, el `DataTable` dispara `onLazyLoad` al paginar, ordenar o filtrar por columna; se reenvían `{ first, rows, sortField, sortOrder, filters }` a `cargarFases`.
- `totalRecords={totalFases}` alimenta el paginador.
- Orden inicial: si no hay uno elegido, usa la primera columna ordenable y la pone DESC.

## Acciones y permisos
- Toolbar: `onSearch`, `clearFilters`, `onNew`, `onDownloadCSV`.
- Fila: `onView`/`onEdit` abren panel; `onDelete` confirma y comprueba tareas asociadas antes de borrar (usa `TareasFasesAPI`; si hay dependencias, muestra aviso).
- `usePermisos` controla qué acciones se muestran (`ver`, `editar`, `borrar`, `nuevo`).

## Panel de edición
- `onSave` crea o actualiza la fase desde `GestorEditores` y recarga al cerrar.
- Al borrar, si hay tareas relacionadas no se elimina y se muestra toast de aviso.
