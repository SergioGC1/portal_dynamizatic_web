# Productos

Organización actual:
- `page.tsx`: entrada mínima; renderiza el componente principal.
- `ProductosListado.tsx`: lógica completa del listado (tabla, filtros, permisos, CRUD).
- `editar.tsx`: pantalla/panel de edición de producto (usa `EditarDatosProductos` y debajo las fases/tareas).
- `EditarDatosProductos.tsx`: formulario de datos del producto.
- `fases_tareas/`: componentes para fases y tareas del producto (`FasesTareasProducto.tsx`, `EditarFaseTareasProducto.tsx`).

Flujo:
1) `page.tsx` → `ProductosListado` (tabla y acciones).
2) Al editar/crear, se usa `editar.tsx` como panel, que incluye datos + fases/tareas.

Todo el código y comentarios están en español para lectura rápida.
