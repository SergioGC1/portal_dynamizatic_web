// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de usuarios
const usuariosAPI = require('./usuarios.api.js');

module.exports = {
  findUsuarios: (params) => usuariosAPI.find(params),
  getUsuarioById: (id) => usuariosAPI.getById(id),
  createUsuario: (payload) => usuariosAPI.create(payload),
  updateUsuarioById: (id, payload) => usuariosAPI.update(id, payload),
  replaceUsuarioById: (id, payload) => usuariosAPI.replace(id, payload),
  deleteUsuarioById: (id) => usuariosAPI.delete(id),
  countUsuarios: (where) => usuariosAPI.count(where),
  login: (data) => usuariosAPI.login(data),
  register: (data) => usuariosAPI.register(data),
};
