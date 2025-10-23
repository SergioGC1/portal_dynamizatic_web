// Adapter que reexporta la implementación fetch-based en credenciales-usuarios.api.js
const credencialesApi = require('./credenciales-usuarios.api.js');

module.exports = {
  findCredencialesUsuarios: (params) => credencialesApi.find(params),
  getCredencialesUsuarioById: (id) => credencialesApi.getById(id),
  createCredencialesUsuario: (payload) => credencialesApi.create(payload),
  updateCredencialesUsuarioById: (id, payload) => credencialesApi.update(id, payload),
  replaceCredencialesUsuarioById: (id, payload) => credencialesApi.replace(id, payload),
  deleteCredencialesUsuarioById: (id) => credencialesApi.delete(id),
  countCredencialesUsuarios: (where) => credencialesApi.count(where),
};
