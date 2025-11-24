# Productos - Resumen rápido

- **Carga lazy**: `TableToolbar` llama a `cargarProductos` con `limit`, `offset`, `search`, `sortField`, `sortOrder` y filtros de columna (`estadoId`, `activoSn`).
- **Orden inicial**: primera columna ordenable (`nombre`) baja en DESC; `ordenTabla` mantiene el orden en paginación y recargas.
- **Paginación**: `tablaPaginacion` controla `first/rows`; `onLazyLoad` reenvía el estado al back.
- **Filtros**: Dropdown de estados desde `estadosAPI`; S/N en booleanos; resto de texto.
- **Acciones**: ver/editar/borrar con confirmación; recarga tras guardar/borrar o subida de archivo.
- **Permisos**: `usePermisos` alimenta `puede` para mostrar/ocultar acciones.
