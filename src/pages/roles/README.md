# Roles - Resumen rápido

- **Carga lazy**: `TableToolbar` dispara `cargarRoles` con `limit`, `offset`, `search`, `sortField`, `sortOrder` y filtros de columna (solo `activoSn`).
- **Orden inicial**: primera columna ordenable (`nombre`) baja de servidor en DESC; el estado `ordenTabla` se mantiene en cada `onLazyLoad`.
- **Paginación**: controlada por `tablaPaginacion`; `onLazyLoad` actualiza `first/rows` y vuelve a pedir al back.
- **Acciones**: ver/editar/borrar; bloquea borrado de “supervisor” y comprueba usuarios vinculados antes de eliminar.
- **Permisos**: `puede` se alimenta de `usePermisos`; oculta botones según rol del usuario.
- **CSV**: usa `DataTable` para exportar columnas visibles.
