# Fases - Resumen rápido

- **Carga lazy**: se consulta al back solo cuando el usuario pulsa “Buscar”; se envían `limit`, `offset`, `search`, `sortField`, `sortOrder`.
- **Orden inicial**: columna `nombre` baja en DESC (estado `ordenTabla`), persistente en paginación y recargas.
- **Paginación**: `tablaPaginacion` controla `first/rows`; `onLazyLoad` reenvía estos datos al backend.
- **Filtros**: solo búsqueda global; sin filtros de columna actualmente.
- **Acciones**: ver/editar/borrar; antes de borrar se comprueban tareas asociadas y se muestra toast si hay dependencias.
- **Permisos**: `usePermisos` define qué acciones puede ver el usuario.
