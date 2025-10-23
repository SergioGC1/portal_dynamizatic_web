# API Endpoints (resumen)

Este directorio centraliza las llamadas a los endpoints del backend y sigue una convención simple y estable para que el resto de la aplicación no dependa de implementaciones concretas (axios, fetch, etc.).

Estructura y flujo (resumido)

- Páginas / componentes
  - Llaman a hooks (por ejemplo `src/hooks/useJwt.js`).

- Hooks (`src/hooks/useJwt.js`)
  - Exponen funciones de alto nivel usadas por la UI (ej.: `signIn`, `signUp`, `getUsuarios`, `getUsuarioById`, `getProductoById`).
  - Internamente llaman a los adaptadores en `src/api-endpoints/*/index.js`.
  - Mantienen lógica de negocio relacionada con la autenticación (guardar tokens en localStorage, extraer tokens, fallbacks simples, etc.).

- Adaptadores (`src/api-endpoints/<recurso>/index.js`)
  - Pequeños archivos que reexportan la interfaz pública que espera la UI (por ejemplo `findProductos`, `getProductoById`, `createProducto`, `updateProductoById`, `deleteProductoById`, `countProductos`).
  - Su función es desacoplar la firma estable que usa la UI de la implementación real en `<recurso>.api.js`.
  - Ejemplo: `module.exports = { findProductos: (p) => productosApi.find(p), getProductoById: (id) => productosApi.getById(id), ... }`.

- Implementaciones (fetch) (`src/api-endpoints/<recurso>/<recurso>.api.js`)
  - Implementaciones basadas en `fetch` que hacen las llamadas HTTP reales.
  - Convenciones comunes usadas en todos los módulos:
    - `BASE_URL`: base para las rutas (usa `window.__API_BASE_URL__` si existe, o `http://localhost:3000` por defecto).
    - `getAuthHeader()`: función local que lee `localStorage.getItem('accessToken')` y devuelve `{ Authorization: `Bearer ${token}` }` cuando corresponde.
    - `handleResponse(res, context)`: helper que comprueba `res.ok`; en caso de error lee el cuerpo (texto o JSON) y lanza una excepción con contexto y detalles.
    - Funciones exportadas estándar: `find(params)`, `getById(id)`, `create(payload)`, `update(id, payload)`, `replace(id, payload)`, `delete(id)`, `count(where)`.
  - Evitamos usar axios en el runtime del navegador para evitar problemas de empaquetado; por eso usamos `fetch`.

Convenciones y prácticas

- Nombres: los adaptadores usan nombres en español y con la forma que espera la UI (ej.: `findProductos`, `getProductoById`). Las implementaciones internas usan nombres cortos (`find`, `getById`, `create`, ...).
- Errores: `handleResponse` unifica el manejo y lanza errores legibles; los hooks / componentes deben capturarlos y mostrar mensajes de usuario si hace falta.
- Autenticación: los tokens se guardan en `localStorage` (keys: `accessToken`, `refreshToken`). `getAuthHeader()` los usa para poner `Authorization` en las peticiones.

Cómo añadir un nuevo endpoint (rápido)

1. Crear `src/api-endpoints/<recurso>/<recurso>.api.js` copiando la plantilla de otros archivos y ajustando la ruta base (`/<recurso>`).
2. Crear `src/api-endpoints/<recurso>/index.js` que reexporte las funciones con la firma esperada por la UI.
3. Llamar al adaptador desde un hook (p. ej. `useJwt` o crear un hook propio) y exponer la función a la UI.

Ejemplo mínimo de `index.js`:

```js
const api = require('./mi-recurso.api.js');
module.exports = {
  findMiRecurso: (p) => api.find(p),
  getMiRecursoById: (id) => api.getById(id),
  createMiRecurso: (payload) => api.create(payload),
  // ...
};
```

Notas

- Si deseas pasar query params en `getById`, podemos reintroducir un segundo argumento con validación. Actualmente `getById` acepta sólo `id` por simplicidad.
- Si quieres que centralicemos la cabecera de autenticación en un único helper en vez de `getAuthHeader()` replicado, lo podemos extraer a `src/api-endpoints/_client.js`.

---
Resumen: Hooks → adaptadores (`index.js`) → implementaciones (`<recurso>.api.js`). Mantener esa separación facilita migraciones, pruebas y evita problemas con bibliotecas HTTP en bundle.
