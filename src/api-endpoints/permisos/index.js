// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de permisos
const permisosAPI = require('./permisos.api.js');

module.exports = {
  findPermisos: (params) => permisosAPI.find(params),
  getPermisoById: (id) => permisosAPI.getById(id),
  createPermiso: (payload) => permisosAPI.create(payload),
  updatePermisoById: (id, payload) => permisosAPI.update(id, payload),
  replacePermisoById: (id, payload) => permisosAPI.replace(id, payload),
  deletePermisoById: (id) => permisosAPI.delete(id),
  countPermisos: (where) => permisosAPI.count(where),
};
