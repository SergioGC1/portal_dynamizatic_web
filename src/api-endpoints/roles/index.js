// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de roles
const rolesAPI = require('./roles.api.js');

module.exports = {
  findRoles: (params) => rolesAPI.find(params),
  getRoleById: (id) => rolesAPI.getById(id),
  createRole: (payload) => rolesAPI.create(payload),
  updateRoleById: (id, payload) => rolesAPI.update(id, payload),
  replaceRoleById: (id, payload) => rolesAPI.replace(id, payload),
  deleteRoleById: (id) => rolesAPI.delete(id),
  countRoles: (where) => rolesAPI.count(where),
};
