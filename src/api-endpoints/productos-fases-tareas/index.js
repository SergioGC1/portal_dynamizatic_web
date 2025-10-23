// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de productos-fases-tareas
const pftAPI = require('./productos-fases-tareas.api.js');

module.exports = {
  findProductosFasesTareas: (params) => pftAPI.find(params),
  getProductosFasesTareasById: (id) => pftAPI.getById(id),
  createProductosFasesTareas: (payload) => pftAPI.create(payload),
  updateProductosFasesTareasById: (id, payload) => pftAPI.update(id, payload),
  replaceProductosFasesTareasById: (id, payload) => pftAPI.replace(id, payload),
  deleteProductosFasesTareasById: (id) => pftAPI.delete(id),
  countProductosFasesTareas: (where) => pftAPI.count(where),
};
