// Compatibilidad ESM/CJS: algunos bundlers ponen la librería en `.default`.
// Adaptador: reexporta la implementación nueva y limpia de fases
const fasesAPI = require('./fases.api.js');

module.exports = {
  findFases: (params) => fasesAPI.find(params),
  getFaseById: (id) => fasesAPI.getById(id),
  createFase: (payload) => fasesAPI.create(payload),
  updateFaseById: (id, payload) => fasesAPI.update(id, payload),
  replaceFaseById: (id, payload) => fasesAPI.replace(id, payload),
  deleteFaseById: (id) => fasesAPI.delete(id),
  countFases: (where) => fasesAPI.count(where),
};
