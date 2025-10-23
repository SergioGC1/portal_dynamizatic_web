// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de estados
const estadosAPI = require('./estados.api.js');

module.exports = {
  findEstados: (params) => estadosAPI.find(params),
  getEstadoById: (id) => estadosAPI.getById(id),
  createEstado: (payload) => estadosAPI.create(payload),
  updateEstadoById: (id, payload) => estadosAPI.update(id, payload),
  replaceEstadoById: (id, payload) => estadosAPI.replace(id, payload),
  deleteEstadoById: (id) => estadosAPI.delete(id),
  countEstados: (where) => estadosAPI.count(where),
};
